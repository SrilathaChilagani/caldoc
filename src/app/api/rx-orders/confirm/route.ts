import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";

const PHARMACY_PHONE = process.env.PHARMACY_ADMIN_PHONE || "+15135608528";

function formatItems(items: unknown) {
  if (!Array.isArray(items)) return "";
  return items.map((item) => `${item?.name || "medicine"} × ${item?.qty || 1}`).join(", ");
}

function formatAddress(address: unknown) {
  if (!address) return "";
  const value = address as Record<string, unknown>;
  const parts = [value.line1, value.line2, value.city, value.state, value.postalCode]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId: string = body?.orderId;
    const rzpOrder: string = body?.razorpay_order_id;
    const paymentId: string = body?.razorpay_payment_id;
    const signature: string = body?.razorpay_signature;

    if (!orderId || !rzpOrder || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const secret = process.env.RZP_SECRET;
    if (!secret) return NextResponse.json({ error: "Missing RZP_SECRET" }, { status: 500 });

    const payload = `${rzpOrder}|${paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId: rzpOrder },
      select: { id: true, status: true, rxOrderId: true },
    });
    if (!payment?.rxOrderId) {
      return NextResponse.json({ error: "Payment mapping missing" }, { status: 400 });
    }

    // Guard against payload tampering / mismatched order references.
    if (payment.rxOrderId !== orderId) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 409 });
    }

    // Idempotency: duplicate callback should return success without replaying side-effects.
    if (payment.status === "CAPTURED") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    const txResult = await prisma.$transaction([
      prisma.rxOrder.updateMany({
        where: { id: payment.rxOrderId, status: "AWAITING_PAYMENT" },
        data: { status: "PAID" },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CAPTURED",
          paymentRef: paymentId,
          currency: "INR",
        },
      }),
      prisma.rxOrder.findUniqueOrThrow({ where: { id: payment.rxOrderId } }),
    ]);
    const rxOrder = txResult[2];

    const itemsLabel = formatItems(rxOrder.items);
    const addressLabel = formatAddress(rxOrder.address);
    const adminMsg = `Ad-hoc Rx order ${rxOrder.id} paid. Patient ${rxOrder.patientName} (${rxOrder.patientPhone}). Items: ${itemsLabel}. Address: ${addressLabel}.`;
    const patientMsg = `Hi ${rxOrder.patientName}, we received your CalDoc Rx delivery order ${rxOrder.id}. Our pharmacy will reach out shortly.`;

    const sends: Promise<unknown>[] = [];
    if (PHARMACY_PHONE) {
      sends.push(sendWhatsAppText(PHARMACY_PHONE, adminMsg).catch((err) => console.error("pharmacy WA", err)));
    }
    if (rxOrder.patientPhone) {
      sends.push(sendWhatsAppText(rxOrder.patientPhone, patientMsg).catch((err) => console.error("patient WA", err)));
    }
    await Promise.all(sends);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-order confirm error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
