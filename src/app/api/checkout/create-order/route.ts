import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_AMOUNT = Number(process.env.CONSULT_FEE_PAISE || 49900);

function basicAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appointmentId: string = body?.appointmentId;
    let amount: number = Number(body?.amount);

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        feePaise: true,
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (!amount || Number.isNaN(amount)) {
      amount = appointment.feePaise ?? DEFAULT_AMOUNT;
    }

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      amount = DEFAULT_AMOUNT;
    }

    const key = process.env.RZP_KEY;
    const secret = process.env.RZP_SECRET;
    if (!key || !secret) {
      return NextResponse.json({ error: "Missing RZP_KEY/RZP_SECRET" }, { status: 500 });
    }

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(key, secret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `appt_${appointmentId}`,
        payment_capture: 1,
      }),
    });

    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay order error:", order);
      return NextResponse.json(
        { error: order?.error?.description || "Order create failed" },
        { status: 500 },
      );
    }

    await prisma.payment.upsert({
      where: { appointmentId },
      create: {
        orderId: order.id,
        appointmentId,
        amount,
        currency: "INR",
        status: "PENDING",
        gateway: "RAZORPAY",
      },
      update: {
        orderId: order.id,
        amount,
        currency: "INR",
        status: "PENDING",
        gateway: "RAZORPAY",
      },
    });

    return NextResponse.json({
      key,
      orderId: order.id,
      prefill: {
        name: appointment.patient?.name || undefined,
        contact: appointment.patient?.phone || undefined,
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Server error";
    console.error("create-order error:", e);
    return NextResponse.json({ error }, { status: 500 });
  }
}
