import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

async function uploadFile(
  formData: FormData,
  field: string,
  enrollmentId: string,
  folder: string,
): Promise<string | null> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = file.name.split(".").pop() || "bin";
  const key = `enrollments/${enrollmentId}/${folder}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToS3({ key, body: buffer, contentType: file.type || "application/octet-stream" });
  return key;
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  function field(name: string) {
    return (formData.get(name) as string | null)?.trim() || "";
  }

  // Validate required fields
  const required: Record<string, string> = {
    fullName: "Full name",
    email: "Email address",
    phone: "Mobile number",
    qualification: "Qualification",
    registrationNumber: "Registration number",
    registrationCouncil: "Registering council",
    speciality: "Speciality",
    city: "City",
    state: "State",
  };
  for (const [key, label] of Object.entries(required)) {
    if (!field(key)) {
      return NextResponse.json({ error: `${label} is required.` }, { status: 400 });
    }
  }

  if (field("consentTelemedicine") !== "true") {
    return NextResponse.json(
      { error: "You must agree to the telemedicine guidelines." },
      { status: 400 },
    );
  }

  const languages = formData.getAll("languages[]").map(String).filter(Boolean);
  const visitModes = formData.getAll("visitModes[]").map(String).filter(Boolean);

  if (languages.length === 0 || visitModes.length === 0) {
    return NextResponse.json(
      { error: "Please select languages and consultation modes." },
      { status: 400 },
    );
  }

  // Check for duplicate PENDING/APPROVED submission with same email
  const existing = await prisma.providerEnrollment.findFirst({
    where: {
      email: field("email").toLowerCase(),
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true, status: true },
  });
  if (existing) {
    const msg =
      existing.status === "APPROVED"
        ? "You already have an approved provider account. Please contact support."
        : "An application with this email is already under review. We will contact you shortly.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Create enrollment record first (to get ID for S3 keys)
  const feeRupees = Number(field("feeRupees") || "0");
  const feePaise = feeRupees > 0 ? Math.round(feeRupees * 100) : null;

  const enrollment = await prisma.providerEnrollment.create({
    data: {
      fullName: field("fullName"),
      email: field("email").toLowerCase(),
      phone: field("phone"),
      dob: field("dob") ? new Date(field("dob")) : null,
      gender: field("gender") || null,
      qualification: field("qualification"),
      university: field("university") || null,
      qualificationYear: field("qualificationYear") ? Number(field("qualificationYear")) : null,
      registrationNumber: field("registrationNumber"),
      registrationCouncil: field("registrationCouncil"),
      registrationYear: field("registrationYear") ? Number(field("registrationYear")) : null,
      speciality: field("speciality"),
      subSpeciality: field("subSpeciality") || null,
      experienceYears: field("experienceYears") ? Number(field("experienceYears")) : null,
      currentHospital: field("currentHospital") || null,
      city: field("city"),
      state: field("state"),
      languages,
      visitModes,
      feePaise,
      bio: field("bio") || null,
      consentTelemedicine: true,
    },
  });

  // Upload documents to S3
  try {
    const [profilePhotoKey, qualificationDocKey, registrationDocKey] = await Promise.all([
      uploadFile(formData, "profilePhoto", enrollment.id, "profile"),
      uploadFile(formData, "qualificationDoc", enrollment.id, "qualification"),
      uploadFile(formData, "registrationDoc", enrollment.id, "registration"),
    ]);

    if (profilePhotoKey || qualificationDocKey || registrationDocKey) {
      await prisma.providerEnrollment.update({
        where: { id: enrollment.id },
        data: {
          profilePhotoKey: profilePhotoKey ?? undefined,
          qualificationDocKey: qualificationDocKey ?? undefined,
          registrationDocKey: registrationDocKey ?? undefined,
        },
      });
    }
  } catch (s3Err) {
    console.error("[enroll] S3 upload error:", s3Err);
    // Do not fail the submission if uploads fail — admin can request docs separately
  }

  // Notify admin via WhatsApp
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      const reviewUrl = `${appBaseUrl()}/admin/enrollments/${enrollment.id}`;
      const msg = [
        `🩺 New provider enrollment on CalDoc`,
        `Name: ${field("fullName")}`,
        `Speciality: ${field("speciality")}`,
        `Qualification: ${field("qualification")} — ${field("registrationCouncil")}`,
        `City: ${field("city")}, ${field("state")}`,
        `📋 Review & approve: ${reviewUrl}`,
      ].join("\n");
      await sendWhatsAppText(adminPhone, msg);
      await prisma.providerEnrollment.update({
        where: { id: enrollment.id },
        data: { adminNotifiedAt: new Date() },
      });
    } catch (waErr) {
      console.error("[enroll] admin WA notification failed:", waErr);
    }
  }

  return NextResponse.json({ ok: true, id: enrollment.id });
}
