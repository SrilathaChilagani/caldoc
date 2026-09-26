import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyProviderOfBooking } from "@/lib/sendProviderBookingNotification";
import { sendPatientAudioConfirmation } from "@/lib/sendPatientAudioConfirmation";
import { ensureVideoRoomIfNeeded } from "@/lib/videoLinkHelpers";
import { sendCheckinFormLink } from "@/lib/sendCheckinFormLink";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { notifyLabOrderConfirmation } from "@/lib/sendLabOrderConfirmation";
import { dispatchRxOrder } from "@/lib/pharmacy";
import { dispatchLabOrder } from "@/lib/lab";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://caldoc.in"
  );
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, delayMs * i));
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  // ── Signature verification ────────────────────────────────────────────────
  // Razorpay signs the raw body with the webhook secret (different from RZP_SECRET).
  // Set RZP_WEBHOOK_SECRET in your environment from the Razorpay dashboard.
  const webhookSecret = process.env.RZP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[rzp-webhook] RZP_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: any };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle payment.captured — ignore all other events
  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const entity = event.payload?.payment?.entity;
    const orderId: string = entity?.order_id;
    const paymentId: string = entity?.id;

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: "Missing order_id or payment id" }, { status: 400 });
    }

    // ── Idempotency guard ─────────────────────────────────────────────────
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: { id: true, status: true, appointmentId: true, rxOrderId: true, labOrderId: true },
    });

    if (!payment) {
      console.warn("[rzp-webhook] No payment record found for orderId:", orderId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (payment.status === "CAPTURED") {
      return NextResponse.json({ ok: true });
    }

    // ── Rx order payment ──────────────────────────────────────────────────
    if (payment.rxOrderId) {
      await prisma.$transaction([
        prisma.rxOrder.updateMany({
          where: { id: payment.rxOrderId, status: "AWAITING_PAYMENT" },
          data: { status: "PAID" },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "CAPTURED", paymentRef: paymentId },
        }),
      ]);
      const rxOrder = await prisma.rxOrder.findUniqueOrThrow({ where: { id: payment.rxOrderId } });
      if (rxOrder.patientPhone) {
        sendWhatsAppText(
          rxOrder.patientPhone,
          `Hi ${rxOrder.patientName}, your CalDoc Rx delivery order ${rxOrder.id} is confirmed. Our pharmacy will reach out shortly.`,
        ).catch((e) => console.error("[rzp-webhook] rx patient notify failed:", e));
      }
      dispatchRxOrder(rxOrder.id).catch((e) => console.error("[rzp-webhook] rx dispatch failed:", e));
      return NextResponse.json({ ok: true });
    }

    // ── Lab order payment ─────────────────────────────────────────────────
    if (payment.labOrderId) {
      await prisma.$transaction([
        prisma.labOrder.updateMany({
          where: { id: payment.labOrderId, status: "AWAITING_PAYMENT" },
          data: { status: "PENDING" },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "CAPTURED", paymentRef: paymentId },
        }),
      ]);
      const labOrder = await prisma.labOrder.findUniqueOrThrow({ where: { id: payment.labOrderId } });
      let labPartnerPhone: string | null = null;
      if (labOrder.labPartnerId) {
        const partner = await prisma.labPartner.findUnique({
          where: { id: labOrder.labPartnerId },
          select: { phone: true },
        });
        labPartnerPhone = partner?.phone || null;
      }
      const testsArr = Array.isArray(labOrder.tests) ? labOrder.tests as Array<{ name?: string }> : [];
      const testsLabel = testsArr.map((t) => (typeof t === "string" ? t : t?.name || "test")).join(", ");
      const addr = labOrder.address as Record<string, unknown> | null;
      const addressLabel = addr
        ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode]
            .map((p) => String(p ?? "").trim())
            .filter(Boolean)
            .join(", ")
        : "";
      notifyLabOrderConfirmation({
        orderId: labOrder.id,
        patientName: labOrder.patientName,
        patientPhone: labOrder.patientPhone,
        patientTestsLabel: testsLabel,
        patientAddressLabel: addressLabel,
        adminPhone: labPartnerPhone || process.env.LABS_ADMIN_PHONE || null,
      }).catch((e) => console.error("[rzp-webhook] lab notify failed:", e));
      dispatchLabOrder(labOrder.id).catch((e) => console.error("[rzp-webhook] lab dispatch failed:", e));
      return NextResponse.json({ ok: true });
    }

    const appointmentId = payment.appointmentId;
    if (!appointmentId) {
      console.warn("[rzp-webhook] Unknown payment type for orderId:", orderId);
      return NextResponse.json({ ok: true, ignored: true });
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

    if (!appointment || !appointment.slotId) {
      return NextResponse.json({ error: "Appointment or slot not found" }, { status: 404 });
    }

    // ── Confirm payment + update appointment ──────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          status: "CAPTURED",
          paymentRef: paymentId,
          receiptUrl: `/api/payments/${orderId}/receipt`,
        },
      });

      await tx.slot.update({
        where: { id: appointment.slotId! },
        data: { isBooked: true },
      });

      // Auto-confirm on payment capture — no manual provider step.
      // Preserve terminal states so a retried webhook can't resurrect a
      // cancelled/completed/no-show appointment.
      const nextStatus =
        appointment.status === "COMPLETED" ||
        appointment.status === "CANCELLED" ||
        appointment.status === "NO_SHOW"
          ? appointment.status
          : "CONFIRMED";
      if (appointment.status !== nextStatus) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: nextStatus,
            statusHistory: {
              create: {
                fromStatus: appointment.status,
                toStatus: nextStatus,
                actorType: "SYSTEM",
                reason: "Payment captured via Razorpay webhook — auto-confirmed",
              },
            },
          },
        });
      }
    });

    // ── Side-effects (fire-and-forget with retry) ─────────────────────────
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
      ).catch((err) => console.error("[rzp-webhook] provider notify failed:", err));
    }

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
      ).catch((err) => console.error("[rzp-webhook] audio confirm failed:", err));
    }

    if (appointment.visitMode !== "AUDIO") {
      withRetry(() =>
        ensureVideoRoomIfNeeded(
          appointment.id,
          {
            visitMode: appointment.visitMode,
            videoRoom: appointment.videoRoom,
            slotStartsAt: appointment.slot?.startsAt ?? null,
            forceImmediate: true,
          },
          appBaseUrl(),
        )
      ).catch((err) => console.error("[rzp-webhook] video room setup failed:", err));
    }

    if (appointment.patient?.phone && appointment.slot?.startsAt) {
      withRetry(() =>
        sendCheckinFormLink({
          appointmentId: appointment.id,
          patientPhone: appointment.patient!.phone,
          patientName: appointment.patientName || appointment.patient?.name || "Patient",
          slotStartsAt: appointment.slot!.startsAt,
        })
      ).catch((err) => console.error("[rzp-webhook] checkin link failed:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[rzp-webhook] error:", err);
    // Return 500 so Razorpay retries the webhook
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
