import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

type RouteParams = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await requireNgoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reservationId } = await params;
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservation ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let amountPaise: number | null = null;
  if (typeof body.amountPaise === "number" && Number.isFinite(body.amountPaise)) {
    amountPaise = Math.max(0, Math.round(body.amountPaise));
  }

  const notes =
    typeof body.notes === "string"
      ? body.notes.trim().slice(0, 500)
      : body.notes === null
      ? null
      : undefined;

  if (amountPaise === null && notes === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const reservation = await prisma.ngoReservation.findFirst({
    where: { id: reservationId, ngoId: session.ngoId },
    select: { id: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (amountPaise !== null) data.amountPaise = amountPaise;
  if (notes !== undefined) data.notes = notes;

  await prisma.ngoReservation.update({
    where: { id: reservation.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
