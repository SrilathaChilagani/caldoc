import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ appointmentId: string }> };

async function resolvePatient() {
  const sess = await readPatientSession();
  if (!sess) return null;
  return prisma.patient.findUnique({ where: { phone: sess.phone }, select: { id: true } });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const patient = await resolvePatient();
  if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = await params;
  const rating = await prisma.appointmentRating.findUnique({ where: { appointmentId } });
  return NextResponse.json(rating ?? null);
}

export async function POST(req: NextRequest, { params }: Params) {
  const patient = await resolvePatient();
  if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = await params;
  const { rating, comment } = await req.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  // Verify appointment belongs to this patient and is COMPLETED
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: patient.id, status: "COMPLETED" },
    select: { id: true, providerId: true },
  });
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found or not yet completed" }, { status: 404 });
  }

  const result = await prisma.appointmentRating.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      patientId: patient.id,
      providerId: appt.providerId,
      rating,
      comment: comment?.trim() || null,
    },
    update: { rating, comment: comment?.trim() || null },
  });

  return NextResponse.json(result, { status: 201 });
}
