import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyProviderOfBooking } from "@/lib/sendProviderBookingNotification";
import { sendPatientAudioConfirmation } from "@/lib/sendPatientAudioConfirmation";
import { getErrorMessage } from "@/lib/errors";

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

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        providerId: true,
        slotId: true,
        visitMode: true,
        patient: { select: { name: true, phone: true } },
        provider: { select: { name: true, phone: true } },
        slot: { select: { startsAt: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (!appointment.slotId) {
      return NextResponse.json({ error: "Slot missing for appointment" }, { status: 400 });
    }

    const slotId = appointment.slotId;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          status: "CAPTURED",
          paymentRef: paymentId,
          receiptUrl: `/api/payments/${orderId}/receipt`,
        },
      });

      const locked = await tx.slot.updateMany({
        where: { id: slotId, providerId: appointment.providerId, isBooked: false },
        data: { isBooked: true },
      });

      if (locked.count === 0) {
        throw new Error("This slot is no longer available. Please choose another time.");
      }

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CONFIRMED" },
      });
    });

    if (appointment.provider?.phone && appointment.slot?.startsAt) {
      notifyProviderOfBooking({
        appointmentId: appointment.id,
        providerId: appointment.providerId,
        providerPhone: appointment.provider.phone,
        providerName: appointment.provider.name || "Doctor",
        patientName: appointment.patient?.name || "Patient",
        slotStartsAt: appointment.slot.startsAt,
      }).catch((err) => console.error("provider notify error", err));
    }

    if (
      appointment.visitMode === "AUDIO" &&
      appointment.patient?.phone &&
      appointment.slot?.startsAt
    ) {
      sendPatientAudioConfirmation({
        appointmentId: appointment.id,
        patientPhone: appointment.patient.phone,
        patientName: appointment.patient.name,
        providerName: appointment.provider?.name || "Doctor",
        slotStartsAt: appointment.slot.startsAt,
      }).catch((err) => console.error("patient audio notify error", err));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = getErrorMessage(e);
    const status = message.toLowerCase().includes("slot") ? 409 : 500;
    console.error("checkout confirm error:", e);
    return NextResponse.json({ error: message }, { status });
  }
}
