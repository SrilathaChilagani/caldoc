import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { notifyProviderOfBooking } from "@/lib/sendProviderBookingNotification";
import { sendPatientAudioConfirmation } from "@/lib/sendPatientAudioConfirmation";

const DEFAULT_AMOUNT = Number(process.env.CONSULT_FEE_PAISE || 100);

type CreateAppointmentPayload = {
  providerId?: string;
  slotId?: string;
  name?: string;
  phone?: string;
  notes?: string;
  consentText?: string;
  visitMode?: "VIDEO" | "AUDIO";
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

    const meta = buildPatientPhoneMeta(phone);
    if (!meta) {
      return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
    }

    const consentPayload = {
      consentType: "EXPLICIT" as const,
      consentMode: "APP_SCREEN",
      consentText,
      consentAt: new Date(),
    };

    const result = await prisma.$transaction(
      async (tx) => {
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

        const slotRecord = await tx.slot.findUnique({
          where: { id: slotId },
          select: {
            startsAt: true,
            feePaise: true,
            isBooked: true,
            provider: {
              select: { defaultFeePaise: true },
            },
          },
        });

        if (!slotRecord) {
          throw new Error("Slot not found");
        }

        if (slotRecord.isBooked) {
          throw new Error("This slot is no longer available. Please pick another time.");
        }

        const slotFeePaise = slotRecord.feePaise ?? slotRecord.provider?.defaultFeePaise ?? DEFAULT_AMOUNT;

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
            ...consentPayload,
          },
          select: { id: true },
        });

        return {
          appointmentId: appointment.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          slotStartsAt: slotRecord.startsAt,
          providerId,
          feePaise: slotFeePaise,
        };
      },
      {
        maxWait: 10_000,
        timeout: 15_000,
      },
    );

    return NextResponse.json({ appointmentId: result.appointmentId, amount: result.feePaise ?? DEFAULT_AMOUNT });
  } catch (err) {
    const message = getErrorMessage(err);
    const isSlotError = message.includes("slot");
    const isTransactionError = message.toLowerCase().includes("transaction");
    const status = isSlotError ? 409 : isTransactionError ? 503 : 500;
    const publicMessage = isTransactionError
      ? "Our booking system is busy at the moment. Please try again in a few seconds."
      : message;
    return NextResponse.json({ error: publicMessage }, { status });
  }
}
