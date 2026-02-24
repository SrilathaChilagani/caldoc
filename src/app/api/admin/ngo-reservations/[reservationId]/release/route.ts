import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId } = await params;

  const reservation = await prisma.ngoReservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true, slotId: true },
  });

  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reservation.status !== "HELD")
    return NextResponse.json({ error: "Only HELD reservations can be released" }, { status: 400 });

  await prisma.$transaction([
    prisma.ngoReservation.update({
      where: { id: reservationId },
      data: { status: "RELEASED", slotId: null },
    }),
    ...(reservation.slotId
      ? [prisma.slot.update({ where: { id: reservation.slotId }, data: { isBooked: false } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
