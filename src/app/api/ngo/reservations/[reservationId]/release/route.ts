import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

type RouteParams = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await requireNgoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reservationId } = await params;
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservation ID" }, { status: 400 });
  }

  const reservation = await prisma.ngoReservation.findFirst({
    where: { id: reservationId, ngoId: session.ngoId },
    select: { id: true, status: true, slotId: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (reservation.status !== "HELD") {
    return NextResponse.json({ error: "Only held reservations can be released" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (reservation.slotId) {
        await tx.slot.update({ where: { id: reservation.slotId }, data: { isBooked: false } });
      }
      await tx.ngoReservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED", slotId: null },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to release reservation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
