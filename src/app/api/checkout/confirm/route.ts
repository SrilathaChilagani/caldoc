import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyProviderOfBooking } from "@/lib/sendProviderBookingNotification";
import { sendPatientAudioConfirmation } from "@/lib/sendPatientAudioConfirmation";
import { getErrorMessage } from "@/lib/errors";
import { ensureVideoRoomIfNeeded } from "@/lib/videoLinkHelpers";
import { sendCheckinFormLink } from "@/lib/sendCheckinFormLink";

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

// Retry helper for unreliable side-effects (notifications, video room setup).
// Uses linear back-off: 1 s, 2 s, 3 s between attempts.
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * i));
      }
    }
  }
  throw lastError;
}

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

    // Idempotency guard: if this payment was already captured, return success
    // without reprocessing (prevents duplicate notifications on webhook retry).
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
      select: { status: true },
    });
    if (existingPayment?.status === "CAPTURED") {
      return NextResponse.json({ ok: true });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        providerId: true,
        slotId: true,
        visitMode: true,
        videoRoom: true,
        patientName: true,
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

      // Slot was pre-locked atomically at appointment creation.
      // Unconditionally ensure it remains booked to guard against any
      // edge case where it was inadvertently freed.
      await tx.slot.update({
        where: { id: slotId },
        data: { isBooked: true },
      });

      const nextStatus = appointment.status === "CONFIRMED" ? "CONFIRMED" : "PENDING";
      const statusHistoryData =
        appointment.status !== nextStatus
          ? {
              statusHistory: {
                create: {
                  fromStatus: appointment.status,
                  toStatus: nextStatus,
                  actorType: "SYSTEM",
                  reason: "Payment captured, awaiting provider confirmation",
                },
              },
            }
          : {};

      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: nextStatus,
          ...statusHistoryData,
        },
      });
    });

    // Provider booking notification — retried up to 3 times with back-off
    if (appointment.provider?.phone && appointment.slot?.startsAt) {
      withRetry(() =>
        notifyProviderOfBooking({
          appointmentId: appointment.id,
          providerId: appointment.providerId,
          providerPhone: appointment.provider!.phone!,
          providerName: appointment.provider?.name || "Doctor",
          patientName: appointment.patientName || appointment.patient?.name || "Patient",
          slotStartsAt: appointment.slot!.startsAt,
        })
      ).catch((err) =>
        console.error("[confirm] provider notify failed after retries:", err)
      );
    }

    // Patient audio confirmation — retried up to 3 times
    if (
      appointment.visitMode === "AUDIO" &&
      appointment.patient?.phone &&
      appointment.slot?.startsAt
    ) {
      withRetry(() =>
        sendPatientAudioConfirmation({
          appointmentId: appointment.id,
          patientPhone: appointment.patient!.phone,
          patientName: appointment.patientName || appointment.patient?.name || "Patient",
          providerName: appointment.provider?.name || "Doctor",
          slotStartsAt: appointment.slot!.startsAt,
        })
      ).catch((err) =>
        console.error("[confirm] patient audio notify failed after retries:", err)
      );
    }

    // Video room setup — retried up to 3 times, non-blocking
    if (appointment.visitMode !== "AUDIO") {
      const baseUrl = appBaseUrl();
      withRetry(() =>
        ensureVideoRoomIfNeeded(
          appointment.id,
          {
            visitMode: appointment.visitMode,
            videoRoom: appointment.videoRoom,
            slotStartsAt: appointment.slot?.startsAt ?? null,
            forceImmediate: true,
          },
          baseUrl,
        )
      ).catch((err) =>
        console.error("[confirm] video room setup failed after retries:", err)
      );
    }

    // Patient check-in form link — non-blocking
    if (appointment.patient?.phone && appointment.slot?.startsAt) {
      withRetry(() =>
        sendCheckinFormLink({
          appointmentId: appointment.id,
          patientPhone: appointment.patient!.phone,
          patientName: appointment.patientName || appointment.patient?.name || "Patient",
          slotStartsAt: appointment.slot!.startsAt,
        })
      ).catch((err) =>
        console.error("[confirm] checkin link send failed after retries:", err)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = getErrorMessage(e);
    const status = message.toLowerCase().includes("slot") ? 409 : 500;
    console.error("checkout confirm error:", e);
    return NextResponse.json({ error: message }, { status });
  }
}
