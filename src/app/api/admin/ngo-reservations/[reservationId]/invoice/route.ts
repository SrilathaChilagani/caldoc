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
    select: { id: true, status: true },
  });

  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reservation.status !== "CONFIRMED")
    return NextResponse.json({ error: "Only CONFIRMED reservations can be invoiced" }, { status: 400 });

  await prisma.ngoReservation.update({
    where: { id: reservationId },
    data: { status: "INVOICE_REQUESTED" },
  });

  return NextResponse.json({ ok: true });
}
