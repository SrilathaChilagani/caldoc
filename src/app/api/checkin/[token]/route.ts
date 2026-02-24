import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { verifyCheckinToken } from "@/lib/checkinToken";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = verifyCheckinToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired check-in link." }, { status: 401 });
  }

  const { appointmentId } = payload;

  // Idempotency — reject if already completed
  const existing = await prisma.checkInForm.findUnique({
    where: { appointmentId },
    select: { completedAt: true },
  });
  if (existing?.completedAt) {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  // Verify appointment exists
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  // Sanitise and assemble the structured form data
  const formData = {
    submittedAt: new Date().toISOString(),
    appointmentId,
    chiefComplaint: String(body.chiefComplaint || "").trim().slice(0, 2000),
    symptomDuration: String(body.symptomDuration || "").trim().slice(0, 100),
    conditions: Array.isArray(body.conditions) ? body.conditions.map(String) : [],
    conditionsOther: String(body.conditionsOther || "").trim().slice(0, 500),
    currentMedications: String(body.currentMedications || "").trim().slice(0, 2000),
    noMedications: Boolean(body.noMedications),
    drugAllergies: Array.isArray(body.drugAllergies) ? body.drugAllergies.map(String) : [],
    drugAllergiesOther: String(body.drugAllergiesOther || "").trim().slice(0, 500),
    foodAllergies: String(body.foodAllergies || "").trim().slice(0, 500),
    environmentalAllergies: String(body.environmentalAllergies || "").trim().slice(0, 500),
    noKnownAllergies: Boolean(body.noKnownAllergies),
    smokingStatus: ["never", "former", "current"].includes(body.smokingStatus)
      ? (body.smokingStatus as string)
      : "",
    alcoholUse: ["none", "occasional", "regular"].includes(body.alcoholUse)
      ? (body.alcoholUse as string)
      : "",
    currentSymptoms: Array.isArray(body.currentSymptoms) ? body.currentSymptoms.map(String) : [],
    vitals: {
      bpSystolic: body.bpSystolic ? Number(body.bpSystolic) : null,
      bpDiastolic: body.bpDiastolic ? Number(body.bpDiastolic) : null,
      heartRate: body.heartRate ? Number(body.heartRate) : null,
      temperature: String(body.temperature || "").trim().slice(0, 20),
      weightKg: body.weight ? Number(body.weight) : null,
      spo2: body.spo2 ? Number(body.spo2) : null,
    },
    additionalInfo: String(body.additionalInfo || "").trim().slice(0, 2000),
  };

  // Upload to S3
  const s3Key = `checkin/${appointmentId}/form.json`;
  try {
    await uploadToS3({
      key: s3Key,
      contentType: "application/json",
      body: JSON.stringify(formData, null, 2),
    });
  } catch (err) {
    console.error("[checkin] S3 upload failed:", err);
    // Continue to save DB record even if S3 fails — data is not lost
  }

  // Upsert CheckInForm record
  await prisma.checkInForm.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      s3Key,
      chiefComplaint: formData.chiefComplaint,
      completedAt: new Date(),
    },
    update: {
      s3Key,
      chiefComplaint: formData.chiefComplaint,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
