import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchWithBackoff } from "@/lib/fetchWithBackoff";

function basicAuthHeader(key: string, secret: string) {
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId: string = body?.orderId;
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const labOrder = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!labOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (labOrder.status !== "AWAITING_PAYMENT") {
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
        amount: labOrder.amountPaise ?? 0,
        currency: "INR",
        receipt: `lab_${orderId}`,
        payment_capture: 1,
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay lab order error", order);
      return NextResponse.json({ error: order?.error?.description || "Unable to create payment order" }, { status: 500 });
    }

    await prisma.payment.upsert({
      where: { labOrderId: orderId },
      create: {
        labOrderId: orderId,
        orderId: order.id,
        amount: labOrder.amountPaise ?? 0,
        currency: "INR",
        gateway: "RAZORPAY",
        status: "PENDING",
      },
      update: {
        orderId: order.id,
        amount: labOrder.amountPaise ?? 0,
        currency: "INR",
        gateway: "RAZORPAY",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      key,
      orderId: order.id,
      prefill: {
        name: labOrder.patientName ?? undefined,
        contact: labOrder.patientPhone ?? undefined,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("lab-order create error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
