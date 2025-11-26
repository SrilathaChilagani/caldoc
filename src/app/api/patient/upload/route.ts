import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { verifyPatientUploadToken } from "@/lib/patientUploadToken";

const MAX_BYTES =
  Number(process.env.PATIENT_UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = String(formData.get("token") || "");
  const file = formData.get("file");

  if (!token || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing token or file" },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "File cannot be empty" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB` },
      { status: 400 }
    );
  }

  const decoded = verifyPatientUploadToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: decoded.appointmentId },
    select: { id: true, patientId: true },
  });

  if (!appointment || appointment.patientId !== decoded.patientId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `patients/${decoded.patientId}/appointments/${decoded.appointmentId}/documents/${randomUUID()}-${file.name}`;

  await uploadToS3({
    key,
    contentType: file.type || "application/octet-stream",
    body: buffer,
  });

  await prisma.patientDocument.create({
    data: {
      appointmentId: appointment.id,
      patientId: decoded.patientId,
      key,
      fileName: file.name || "document",
      contentType: file.type || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
