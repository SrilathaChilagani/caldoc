import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const phone = await readPatientPhone();
    if (!phone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { appointmentId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        patientId: true,
        slotId: true,
        slot: { select: { startsAt: true } },
      },
    });

    if (!appointment || appointment.patientId !== patient.id) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot cancel an appointment with status ${appointment.status}` },
        { status: 409 },
      );
    }

    // Prevent cancellation within 1 hour of the appointment
    if (appointment.slot?.startsAt) {
      const minsUntil = (appointment.slot.startsAt.getTime() - Date.now()) / 60_000;
      if (minsUntil < 60) {
        return NextResponse.json(
          { error: "Appointments cannot be cancelled within 1 hour of the scheduled time." },
          { status: 409 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELED",
          statusHistory: {
            create: {
              fromStatus: appointment.status,
              toStatus: "CANCELED",
              actorType: "PATIENT",
              reason: "Cancelled by patient",
            },
          },
        },
      });

      // Free the slot so others can book
      if (appointment.slotId) {
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { isBooked: false },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
