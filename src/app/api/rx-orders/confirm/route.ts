import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { dispatchRxOrder } from "@/lib/pharmacy";
import { logAudit } from "@/lib/audit";

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

    // Idempotency: duplicate callback returns success without replaying side-effects.
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
        data: { status: "CAPTURED", paymentRef: paymentId, currency: "INR" },
      }),
      prisma.rxOrder.findUniqueOrThrow({ where: { id: payment.rxOrderId } }),
    ]);
    const rxOrder = txResult[2];

    sendWhatsAppText(
      rxOrder.patientPhone,
      `Hi ${rxOrder.patientName}, payment received for your medicine order. Your pharmacy partner is now processing it. Track at caldoc.in/services/rx-delivery/success?order=${rxOrder.id}`,
    ).catch((e) => console.error("rx confirm WA error", e));

    // Dispatch to pharmacy API (fire-and-forget; failures retried by cron)
    dispatchRxOrder(rxOrder.id).catch((e) => console.error("rx dispatch error", e));
    logAudit({ action: "RX_PAYMENT_CAPTURED", actorType: "SYSTEM", meta: { rxOrderId: payment.rxOrderId, rzpOrder, paymentId } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-order confirm error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
