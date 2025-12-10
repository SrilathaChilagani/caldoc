import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appointmentId: string = body?.appointmentId;
    const orderId: string = body?.razorpay_order_id;
    const paymentId: string = body?.razorpay_payment_id;
    const signature: string = body?.razorpay_signature;

    if (!appointmentId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const secret = process.env.RZP_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing RZP_SECRET" }, { status: 500 });
    }

    const payload = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await prisma.payment.update({
      where: { orderId },
      data: {
        status: "CAPTURED",
        paymentRef: paymentId,
        receiptUrl: `/api/payments/${orderId}/receipt`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Server error";
    console.error("checkout confirm error:", e);
    return NextResponse.json({ error }, { status: 500 });
  }
}
