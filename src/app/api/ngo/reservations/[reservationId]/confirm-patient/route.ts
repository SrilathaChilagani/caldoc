import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const session = await requireNgoSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId } = await params;
  const body = await req.json().catch(() => ({}));

  const patientName = (body.patientName as string | undefined)?.trim();
  const patientPhone = (body.patientPhone as string | undefined)?.trim();
  const patientEmail = (body.patientEmail as string | undefined)?.trim() || null;
  const visitMode = (body.visitMode as string | undefined) === "AUDIO" ? "AUDIO" : "VIDEO";

  if (!patientName || !patientPhone) {
    return NextResponse.json({ error: "Patient name and phone are required." }, { status: 400 });
  }

  // Validate the reservation belongs to this NGO and is still HELD
  const reservation = await prisma.ngoReservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      ngoId: true,
      status: true,
      slotId: true,
      providerId: true,
      amountPaise: true,
      appointmentId: true,
    },
  });

  if (!reservation) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  if (reservation.ngoId !== session.ngoId)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (reservation.status !== "HELD")
    return NextResponse.json({ error: "Only HELD reservations can be assigned a patient." }, { status: 400 });
  if (!reservation.slotId)
    return NextResponse.json({ error: "Reservation has no associated slot." }, { status: 400 });

  // Find or create the patient record by phone
  let patient = await prisma.patient.findFirst({
    where: { phone: patientPhone },
    select: { id: true },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: patientName,
        phone: patientPhone,
        ...(patientEmail ? { email: patientEmail } : {}),
      },
      select: { id: true },
    });
  }

  // Create the appointment and update reservation in a transaction
  const appointment = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.create({
      data: {
        patientId: patient!.id,
        patientName,
        providerId: reservation.providerId,
        slotId: reservation.slotId,
        status: "CONFIRMED",
        visitMode,
        feePaise: reservation.amountPaise,
        consentText: "NGO booking — patient consent obtained in-person by NGO staff.",
        consentType: "NGO_INPERSON",
        consentAt: new Date(),
        consentMode: "NGO",
      },
      select: { id: true },
    });

    await tx.ngoReservation.update({
      where: { id: reservationId },
      data: {
        status: "CONFIRMED",
        appointmentId: appt.id,
        confirmedAt: new Date(),
      },
    });

    return appt;
  });

  return NextResponse.json({ ok: true, appointmentId: appointment.id });
}
