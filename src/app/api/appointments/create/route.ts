import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";

// Server-side canonical consent text — never trust the client-submitted string for legal records.
const CANONICAL_CONSENT_TEXT =
  "I confirm that I have read the CalDoc disclaimer and consent to receiving medical advice via telemedicine.";

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
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }

    // Validate bookerPhone if provided
    const rawBookerPhone = body.bookerPhone?.trim() || null;
    let bookerPhone: string | null = null;
    if (rawBookerPhone) {
      const bookerMeta = buildPatientPhoneMeta(rawBookerPhone);
      if (!bookerMeta) {
        return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number for the booker" }, { status: 400 });
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
          select: { id: true },
        });

        return { appointmentId: appointment.id, feePaise: slotFeePaise };
      },
      { maxWait: 10_000, timeout: 15_000 }
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
