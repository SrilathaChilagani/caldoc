import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchWithBackoff } from "@/lib/fetchWithBackoff";

function basicAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId: string = body?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const rxOrder = await prisma.rxOrder.findUnique({ where: { id: orderId } });
    if (!rxOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (rxOrder.status !== "AWAITING_PAYMENT") {
      return NextResponse.json({ error: "Order already processed" }, { status: 400 });
    }

    const key = process.env.RZP_KEY;
    const secret = process.env.RZP_SECRET;
    if (!key || !secret) {
      return NextResponse.json({ error: "Missing Razorpay credentials" }, { status: 500 });
    }

    const rzpRes = await fetchWithBackoff("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(key, secret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: rxOrder.amountPaise,
        currency: "INR",
        receipt: `rx_${orderId}`,
        payment_capture: 1,
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay order error", order);
      return NextResponse.json({ error: order?.error?.description || "Order create failed" }, { status: 500 });
    }

    await prisma.payment.upsert({
      where: { rxOrderId: orderId },
      create: {
        rxOrderId: orderId,
        orderId: order.id,
        amount: rxOrder.amountPaise,
        currency: "INR",
        gateway: "RAZORPAY",
        status: "PENDING",
      },
      update: {
        orderId: order.id,
        amount: rxOrder.amountPaise,
        currency: "INR",
        gateway: "RAZORPAY",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      key,
      orderId: order.id,
      prefill: {
        name: rxOrder.patientName,
        contact: rxOrder.patientPhone,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-order create error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
