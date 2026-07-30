import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePharmacySession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Pharmacy can advance paid orders through the fulfilment pipeline only.
// AWAITING_PAYMENT, PAID, and CANCELLED are set by the payment gateway or admin.
const PHARMACY_ALLOWED = ["PROCESSING", "DISPATCHED", "DELIVERED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requirePharmacySession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      pharmacyPartnerId: true,
      patientPhone: true,
      patientName: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Partner-scoped users can only update their own orders.
  // Admin (pharmacyPartnerId === null) can update any.
  if (sess.pharmacyPartnerId && order.pharmacyPartnerId !== sess.pharmacyPartnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const newStatus = String(body.status || "").toUpperCase();
  const note = String(body.note || "").trim().slice(0, 500) || null;
  const trackingNumber = String(body.trackingNumber || "").trim() || null;
  const courierName = String(body.courierName || "").trim() || null;

  if (!PHARMACY_ALLOWED.includes(newStatus)) {
    return NextResponse.json(
      { error: `Pharmacy can set: ${PHARMACY_ALLOWED.join(", ")}` },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (courierName) updateData.courierName = courierName;

  await prisma.$transaction([
    prisma.rxOrder.update({ where: { id }, data: updateData }),
    prisma.rxOrderEvent.create({
      data: {
        rxOrderId: id,
        fromStatus: order.status,
        toStatus: newStatus,
        note,
        trackingNumber,
        courierName,
        actorEmail: sess.email ?? "pharmacy",
      },
    }),
  ]);

  // Notify patient on shipment and delivery
  if (order.patientPhone && (newStatus === "DISPATCHED" || newStatus === "DELIVERED")) {
    const trackInfo =
      newStatus === "DISPATCHED" && trackingNumber
        ? `\nTracking: ${courierName ? courierName + " — " : ""}${trackingNumber}`
        : "";
    const msg =
      newStatus === "DISPATCHED"
        ? `Hi ${order.patientName}, your CalDoc medicine order is on its way!${trackInfo}`
        : `Hi ${order.patientName}, your CalDoc medicine order has been delivered. Get well soon!`;
    sendWhatsAppText(order.patientPhone, msg).catch((e) =>
      console.error("patient dispatch/delivery notify WA", e),
    );
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
