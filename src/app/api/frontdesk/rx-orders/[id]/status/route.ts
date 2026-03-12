import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "AWAITING_PAYMENT", "PAID", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireFrontDeskSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, pharmacyPartnerId, note, trackingNumber, courierName } = body as {
    status?: string;
    pharmacyPartnerId?: string | null;
    note?: string;
    trackingNumber?: string;
    courierName?: string;
  };

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.rxOrder.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (pharmacyPartnerId !== undefined) updateData.pharmacyPartnerId = pharmacyPartnerId || null;
  if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
  if (courierName !== undefined) updateData.courierName = courierName;

  await prisma.$transaction([
    prisma.rxOrder.update({ where: { id }, data: updateData }),
    ...(status
      ? [prisma.rxOrderEvent.create({
          data: {
            rxOrderId: id,
            fromStatus: order.status,
            toStatus: status,
            note: note || null,
            trackingNumber: trackingNumber || null,
            courierName: courierName || null,
            actorEmail: sess.email || "frontdesk",
          },
        })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
