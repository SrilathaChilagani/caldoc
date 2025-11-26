import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { notifyProviderOfBooking } from "@/lib/sendProviderBookingNotification";

const DEFAULT_AMOUNT = Number(process.env.CONSULT_FEE_PAISE || 49900);

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

    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.upsert({
        where: { phone: meta.canonical },
        update: { name, consentAt: new Date() },
        create: { name, phone: meta.canonical, consentAt: new Date() },
      });

      const slotRecord = await tx.slot.findUnique({
        where: { id: slotId },
        select: { startsAt: true },
      });

      if (!slotRecord) {
        throw new Error("Slot not found");
      }

      const locked = await tx.slot.updateMany({
        where: { id: slotId, providerId, isBooked: false },
        data: { isBooked: true },
      });

      if (locked.count === 0) {
        throw new Error("This slot is no longer available. Please pick another time.");
      }

      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          providerId,
          slotId,
          status: "PENDING",
          visitMode: body.visitMode === "AUDIO" ? "AUDIO" : "VIDEO",
          ...consentPayload,
        },
        select: { id: true },
      });

      return { appointmentId: appointment.id, patientName: patient.name, slotStartsAt: slotRecord.startsAt, providerId };
    });

    const providerContact = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { phone: true, name: true },
    });

    if (providerContact?.phone && result.slotStartsAt) {
      notifyProviderOfBooking({
        appointmentId: result.appointmentId,
        providerPhone: providerContact.phone,
        providerName: providerContact.name || "Doctor",
        patientName: result.patientName || "Patient",
        slotStartsAt: result.slotStartsAt,
      }).catch((err) => {
        console.error("provider notify error", err);
      });
    }

    return NextResponse.json({ appointmentId: result.appointmentId, amount: DEFAULT_AMOUNT });
  } catch (err) {
    const message = getErrorMessage(err);
    const status = message.includes("slot") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
