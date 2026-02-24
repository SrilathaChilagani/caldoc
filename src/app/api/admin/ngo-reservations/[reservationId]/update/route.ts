import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};

  if (typeof body.amountPaise === "number") {
    updates.amountPaise = Math.round(body.amountPaise);
  }
  if (typeof body.notes === "string") {
    updates.notes = body.notes.trim().slice(0, 500) || null;
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  await prisma.ngoReservation.update({ where: { id: reservationId }, data: updates });

  return NextResponse.json({ ok: true });
}
