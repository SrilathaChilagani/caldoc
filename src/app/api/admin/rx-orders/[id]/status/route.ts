import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const ALLOWED = ["AWAITING_PAYMENT", "PAID", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  const note = String(body.note || "").trim().slice(0, 500) || null;
  const trackingNumber = String(body.trackingNumber || "").trim() || null;
  const courierName = String(body.courierName || "").trim() || null;

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` }, { status: 400 });
  }

  const order = await prisma.rxOrder.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { status };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (courierName) updateData.courierName = courierName;

  await prisma.$transaction([
    prisma.rxOrder.update({ where: { id }, data: updateData }),
    prisma.rxOrderEvent.create({
      data: {
        rxOrderId: id,
        fromStatus: order.status,
        toStatus: status,
        note,
        trackingNumber,
        courierName,
        actorEmail: "admin",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status });
}
