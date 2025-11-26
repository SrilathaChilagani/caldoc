import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { readPatientSession } from "@/lib/patientAuth.server";

const MAX_BYTES = Number(process.env.PATIENT_UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

type RouteCtx = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await readPatientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await ctx.params;
  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true },
  });

  if (!appointment || appointment.patientId !== patient.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File cannot be empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB`,
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `patients/${patient.id}/appointments/${appointment.id}/documents/${randomUUID()}-${file.name}`;

  await uploadToS3({
    key,
    contentType: file.type || "application/octet-stream",
    body: buffer,
  });

  await prisma.patientDocument.create({
    data: {
      appointmentId: appointment.id,
      patientId: patient.id,
      key,
      fileName: file.name || "document",
      contentType: file.type || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
