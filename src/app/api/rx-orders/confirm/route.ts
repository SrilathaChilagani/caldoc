import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { dispatchRxOrder } from "@/lib/pharmacy";

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

    if (payment.rxOrderId !== orderId) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 409 });
    }

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";

    const sends: Promise<unknown>[] = [];

    // Notify patient
    if (rxOrder.patientPhone) {
      const patientMsg = `Hi ${rxOrder.patientName}, we received your CalDoc Rx delivery order ${rxOrder.id}. Our pharmacy will reach out shortly.`;
      sends.push(
        sendWhatsAppText(rxOrder.patientPhone, patientMsg).catch((e) =>
          console.error("patient Rx WA", e),
        ),
      );
    }

    // Notify the assigned pharmacy partner
    if (rxOrder.pharmacyPartnerId) {
      const partner = await prisma.pharmacyPartner.findUnique({
        where: { id: rxOrder.pharmacyPartnerId },
        select: { phone: true, contactName: true },
      });
      if (partner?.phone) {
        const pharmacyMsg =
          `New Rx order paid — action required!\n\n` +
          `Order: ${rxOrder.id}\n` +
          `Patient: ${rxOrder.patientName} (${rxOrder.patientPhone})\n` +
          `Items: ${itemsLabel}\n` +
          `Delivery address: ${addressLabel}\n\n` +
          `Log in to ${appUrl}/pharmacy to process this order.`;
        sends.push(
          sendWhatsAppText(partner.phone, pharmacyMsg).catch((e) =>
            console.error("pharmacy Rx notify WA", e),
          ),
        );
      }
    }

    await Promise.all(sends);

    // Dispatch to pharmacy API (fire-and-forget; failures recorded on the order,
    // retried by /api/cron/retry-pharmacy-dispatch)
    dispatchRxOrder(rxOrder.id).catch((e) => console.error("pharmacy dispatch error", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-order confirm error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
