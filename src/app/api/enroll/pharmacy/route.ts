import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

export async function POST(req: NextRequest) {
  const data = await req.formData();

  const field = (key: string) => (data.get(key) as string | null)?.trim() ?? "";

  const pharmacyName = field("pharmacyName");
  const contactName = field("contactName");
  const email = field("email");
  const phone = field("phone");
  const addressLine1 = field("addressLine1");
  const city = field("city");
  const state = field("state");
  const pincode = field("pincode");
  const drugLicenseNumber = field("drugLicenseNumber");

  // Required fields validation
  const missing = [
    !pharmacyName && "pharmacyName",
    !contactName && "contactName",
    !email && "email",
    !phone && "phone",
    !addressLine1 && "addressLine1",
    !city && "city",
    !state && "state",
    !pincode && "pincode",
    !drugLicenseNumber && "drugLicenseNumber",
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const serviceAreasRaw = field("serviceAreas");
  const serviceAreas = serviceAreasRaw
    ? serviceAreasRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const enrollment = await prisma.pharmacyEnrollment.create({
    data: {
      pharmacyName,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2: field("addressLine2") || null,
      city,
      state,
      pincode,
      drugLicenseNumber,
      gstNumber: field("gstNumber") || null,
      serviceAreas,
      notes: field("notes") || null,
      status: "PENDING",
    },
  });

  // Notify admin via WhatsApp
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      const base = appBaseUrl();
      const msg = [
        "💊 New pharmacy enrollment on CalDoc",
        `Name: ${pharmacyName}`,
        `Contact: ${contactName}`,
        `City: ${city}, ${state}`,
        `Drug Licence: ${drugLicenseNumber}`,
        `📋 Review: ${base}/admin/enrollments/pharmacy/${enrollment.id}`,
      ].join("\n");
      await sendWhatsAppText(adminPhone, msg);
      await prisma.pharmacyEnrollment.update({
        where: { id: enrollment.id },
        data: { adminNotifiedAt: new Date() },
      });
    } catch (err) {
      console.error("[enroll/pharmacy] admin WA failed:", err);
    }
  }

  return NextResponse.json({ ok: true, id: enrollment.id });
}
