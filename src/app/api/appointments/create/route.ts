import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import { sendSms } from "@/lib/exotel";
import { createCheckinToken } from "@/lib/checkinToken";

const BOOKING_ALERT_TMPL =
  process.env.WHATSAPP_TMPL_PATIENT_BOOKING_ALERT || "patient_booking_alert";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sendBookingAlert(opts: {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  providerName: string;
  slotStartsAt: Date;
}) {
  const { appointmentId, patientName, patientPhone, providerName, slotStartsAt } = opts;
  const firstName = (patientName || "there").split(" ")[0];
  const baseUrl = appBaseUrl();
  const uploadLink = `${baseUrl}/patient/appointments/${appointmentId}`;
  const checkinToken = createCheckinToken(appointmentId, slotStartsAt);
  const checkinLink = `${baseUrl}/checkin/${checkinToken}`;
  const visitTimeLabel = formatIST(slotStartsAt);

  // Template vars match the approved template:
  // {{1}} patient first name  {{2}} upload link  {{3}} visit time
  // {{4}} doctor name         {{5}} check-in link
  const vars = [firstName, uploadLink, visitTimeLabel, providerName, checkinLink];

  const fallbackBody =
    `✅ Booking confirmed!\n\n` +
    `Hi ${firstName}, your appointment with Dr. ${providerName} is confirmed.\n\n` +
    `📅 ${visitTimeLabel} (IST)\n\n` +
    `Track your visit:\n${uploadLink}\n\n` +
    `Check in before your visit:\n${checkinLink}\n\n` +
    `— CalDoc Team`;

  const logMsg = async (status: "SENT" | "FAILED", extra: { template?: string | null; kind: string; messageId?: string | null; error?: string }) =>
    prisma.outboundMessage.create({
      data: {
        appointmentId,
        channel: "WHATSAPP",
        toPhone: patientPhone,
        template: extra.template ?? undefined,
        body: `Booking confirmation → ${visitTimeLabel}`,
        messageId: extra.messageId ?? undefined,
        status,
        kind: extra.kind,
        error: extra.error,
      },
    }).catch(() => {});

  // Try the approved template first
  try {
    const result = await sendWhatsAppTemplate({
      to: patientPhone,
      template: BOOKING_ALERT_TMPL,
      vars,
    });
    await logMsg("SENT", { template: BOOKING_ALERT_TMPL, kind: "PATIENT_BOOKING_ALERT", messageId: result?.messageId });
    return;
  } catch (err) {
    await logMsg("FAILED", {
      template: BOOKING_ALERT_TMPL,
      kind: "PATIENT_BOOKING_ALERT",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback 2: WhatsApp plain text (works within 24-hour customer-service window)
  try {
    const result = await sendWhatsAppText(patientPhone, fallbackBody);
    await logMsg("SENT", { template: null, kind: "PATIENT_BOOKING_ALERT_TEXT", messageId: result?.messageId });
    return;
  } catch (fallbackErr) {
    await logMsg("FAILED", {
      template: null,
      kind: "PATIENT_BOOKING_ALERT_TEXT",
      error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
    });
  }

  // Fallback 3: SMS via Exotel (always works, no WhatsApp needed)
  const smsBody =
    `Booking confirmed! Hi ${firstName}, Dr. ${providerName} on ${visitTimeLabel} (IST). ` +
    `Track: ${uploadLink}`;
  try {
    await sendSms(patientPhone, smsBody);
    await prisma.outboundMessage.create({
      data: {
        appointmentId,
        channel: "SMS",
        toPhone: patientPhone,
        body: smsBody,
        status: "SENT",
        kind: "PATIENT_BOOKING_ALERT_SMS",
      },
    }).catch(() => {});
  } catch (smsErr) {
    console.error("[booking] all channels failed:", smsErr instanceof Error ? smsErr.message : smsErr);
  }
}

// Server-side canonical consent text — never trust the client-submitted string for legal records.
// Compliant with Telemedicine Practice Guidelines 2020 (MoHFW, GSR 226(E)) — Section 3.7 (Patient Consent).
const CANONICAL_CONSENT_TEXT =
  "I confirm that I have read the disclaimer and terms, understand that this is a telemedicine consultation with limitations that may not replace in-person care, consent to a teleconsultation with a registered medical practitioner (NMC/State Medical Council registered), and acknowledge that Schedule X controlled drugs cannot be prescribed via telemedicine.";

type CreateAppointmentPayload = {
  providerId?: string;
  slotId?: string;
  name?: string;
  phone?: string;
  notes?: string;
  consentText?: string;
  visitMode?: "VIDEO" | "AUDIO";
  bookerPhone?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateAppointmentPayload;
    const providerId = body.providerId?.trim();
    const slotId = body.slotId?.trim();
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const consentText = body.consentText?.trim();

    if (!providerId || !slotId || !name || !phone || !consentText) {
      return NextResponse.json({ error: "Missing required fields or consent" }, { status: 400 });
    }

    // Input length guards
    if (name.length > 100) {
      return NextResponse.json({ error: "Patient name must be under 100 characters" }, { status: 400 });
    }
    if (body.notes && body.notes.length > 5000) {
      return NextResponse.json({ error: "Notes must be under 5000 characters" }, { status: 400 });
    }

    // Strict phone validation — must be a valid Indian mobile number
    const meta = buildPatientPhoneMeta(phone);
    if (!meta) {
      return NextResponse.json({ error: "Enter a valid phone number with country code (e.g. +91 for India, +1 for US)" }, { status: 400 });
    }

    // Validate bookerPhone if provided
    const rawBookerPhone = body.bookerPhone?.trim() || null;
    let bookerPhone: string | null = null;
    if (rawBookerPhone) {
      const bookerMeta = buildPatientPhoneMeta(rawBookerPhone);
      if (!bookerMeta) {
        return NextResponse.json({ error: "Enter a valid phone number with country code for the booker" }, { status: 400 });
      }
      bookerPhone = bookerMeta.canonical;
    }

    const consentPayload = {
      consentType: "EXPLICIT" as const,
      consentMode: "APP_SCREEN",
      // Always store server-side text, not whatever the client sent, for legal record integrity
      consentText: CANONICAL_CONSENT_TEXT,
      consentAt: new Date(),
    };

    const result = await prisma.$transaction(
      async (tx) => {
        // ── Patient upsert ──────────────────────────────────────
        let patient = await tx.patient.findUnique({
          where: { phone: meta.canonical },
          select: { id: true, name: true, phone: true },
        });

        if (!patient) {
          try {
            patient = await tx.patient.create({
              data: { name, phone: meta.canonical, consentAt: new Date() },
              select: { id: true, name: true, phone: true },
            });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
              patient = await tx.patient.findUnique({
                where: { phone: meta.canonical },
                select: { id: true, name: true, phone: true },
              });
            } else {
              throw err;
            }
          }
        }

        if (!patient) {
          throw new Error("Unable to create patient profile");
        }

        // ── Slot validation ─────────────────────────────────────
        const slotRecord = await tx.slot.findUnique({
          where: { id: slotId },
          select: {
            providerId: true,
            startsAt: true,
            feePaise: true,
            isBooked: true,
            provider: { select: { defaultFeePaise: true } },
          },
        });

        if (!slotRecord) {
          throw new Error("Slot not found");
        }

        // Cross-validate: slot must belong to the requested provider
        if (slotRecord.providerId !== providerId) {
          throw new Error("Slot does not belong to the selected provider");
        }

        // Reject slots in the past
        if (slotRecord.startsAt < new Date()) {
          throw new Error("This slot has already passed. Please choose a future time.");
        }

        if (slotRecord.isBooked) {
          throw new Error("This slot is no longer available. Please pick another time.");
        }

        // ── Fee enforcement ─────────────────────────────────────
        // Fee must be explicitly configured — no silent ₹1 fallback.
        const slotFeePaise =
          slotRecord.feePaise ??
          slotRecord.provider?.defaultFeePaise ??
          Number(process.env.CONSULT_FEE_PAISE || 0);

        if (!slotFeePaise || slotFeePaise <= 0) {
          throw new Error(
            "Consultation fee is not configured for this slot. Please contact support."
          );
        }

        // ── Lock slot immediately to prevent double-booking ─────
        // updateMany with isBooked:false is atomic — only one concurrent
        // request will get count=1; all others get count=0 and throw.
        const lockResult = await tx.slot.updateMany({
          where: { id: slotId, isBooked: false },
          data: { isBooked: true },
        });
        if (lockResult.count === 0) {
          throw new Error("This slot was just taken. Please pick another time.");
        }

        // ── Create appointment ──────────────────────────────────
        const appointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            patientName: name,
            providerId,
            slotId,
            status: "PENDING",
            visitMode: body.visitMode === "AUDIO" ? "AUDIO" : "VIDEO",
            feePaise: slotFeePaise,
            feeCurrency: "INR",
            ...(bookerPhone ? { bookerPhone } : {}),
            ...consentPayload,
          },
          select: {
            id: true,
            provider: { select: { name: true } },
          },
        });

        return {
          appointmentId: appointment.id,
          feePaise: slotFeePaise,
          providerName: appointment.provider?.name ?? "your doctor",
          slotStartsAt: slotRecord.startsAt,
          patientPhone: patient.phone,
        };
      },
      { maxWait: 10_000, timeout: 15_000 }
    );

    // ── Send booking confirmation WhatsApp (fire-and-forget) ──
    sendBookingAlert({
      appointmentId: result.appointmentId,
      patientName: name,
      patientPhone: result.patientPhone,
      providerName: result.providerName,
      slotStartsAt: result.slotStartsAt,
    }).catch((err) =>
      console.error("[booking] patient_booking_alert failed:", getErrorMessage(err))
    );

    return NextResponse.json({ appointmentId: result.appointmentId, amount: result.feePaise });
  } catch (err) {
    const message = getErrorMessage(err);
    const isSlotError =
      message.toLowerCase().includes("slot") ||
      message.toLowerCase().includes("available") ||
      message.toLowerCase().includes("taken") ||
      message.toLowerCase().includes("passed");
    const isTransactionError = message.toLowerCase().includes("transaction");
    const status = isSlotError ? 409 : isTransactionError ? 503 : 500;
    const publicMessage = isTransactionError
      ? "Our booking system is busy at the moment. Please try again in a few seconds."
      : message;
    return NextResponse.json({ error: publicMessage }, { status });
  }
}
