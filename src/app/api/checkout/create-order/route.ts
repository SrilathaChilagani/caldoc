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
    const appointmentId: string = body?.appointmentId;

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        feePaise: true,
        status: true,
        patientName: true,
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

    // Block if appointment is already confirmed/completed
    if (appointment.status === "CONFIRMED" || appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This appointment has already been paid for." },
        { status: 409 }
      );
    }

    // Idempotency guard — block if a captured payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { appointmentId },
      select: { status: true },
    });
    if (existingPayment?.status === "CAPTURED") {
      return NextResponse.json(
        { error: "Payment already completed for this appointment." },
        { status: 409 }
      );
    }

    // Fee must be explicitly set — no silent fallback to ₹1
    const amount = appointment.feePaise;
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Consultation fee not configured for this appointment. Please contact support." },
        { status: 400 }
      );
    }

    const key = process.env.RZP_KEY;
    const secret = process.env.RZP_SECRET;
    if (!key || !secret) {
      return NextResponse.json({ error: "Missing RZP_KEY/RZP_SECRET" }, { status: 500 });
    }

    const rzpRes = await fetchWithBackoff("https://api.razorpay.com/v1/orders", {
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
        name: appointment.patientName || appointment.patient?.name || undefined,
        contact: appointment.patient?.phone || undefined,
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Server error";
    console.error("create-order error:", e);
    return NextResponse.json({ error }, { status: 500 });
  }
}
