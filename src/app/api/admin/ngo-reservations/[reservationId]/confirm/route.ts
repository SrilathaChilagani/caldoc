import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

type Params = {
  params: Promise<{ reservationId: string }>;
};

export async function POST(_: Request, { params }: Params) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reservationId } = await params;
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservation id" }, { status: 400 });
  }

  const reservation = await prisma.ngoReservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  await prisma.ngoReservation.update({
    where: { id: reservation.id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
