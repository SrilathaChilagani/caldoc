import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireFrontDeskSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { slotId } = body as { slotId?: string };

  if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, slotId: true, providerId: true, status: true, patientName: true },
  });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  if (["CANCELLED", "CANCELED", "COMPLETED"].includes(appointment.status)) {
    return NextResponse.json({ error: "Cannot reschedule a completed or cancelled appointment" }, { status: 409 });
  }

  const newSlot = await prisma.slot.findUnique({ where: { id: slotId } });
  if (!newSlot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  if (newSlot.providerId !== appointment.providerId) {
    return NextResponse.json({ error: "Slot belongs to a different provider" }, { status: 409 });
  }

  // Atomic: check slot is free using conditional update
  const claimed = await prisma.slot.updateMany({
    where: { id: slotId, isBooked: false },
    data: { isBooked: true },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
  }

  await prisma.$transaction([
    // Free old slot
    ...(appointment.slotId
      ? [prisma.slot.update({ where: { id: appointment.slotId }, data: { isBooked: false } })]
      : []),
    // Update appointment
    prisma.appointment.update({
      where: { id },
      data: { slotId, status: "RESCHEDULED" },
    }),
    prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: appointment.status,
        toStatus: "RESCHEDULED",
        actorType: "frontdesk",
        actorId: sess.userId,
        reason: `Rescheduled by front desk to slot ${newSlot.startsAt.toISOString()}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
