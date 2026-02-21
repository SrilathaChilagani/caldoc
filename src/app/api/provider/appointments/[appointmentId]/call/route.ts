import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readProviderSession, requireAdminSession } from "@/lib/auth.server";
import { initiateAudioBridge } from "@/lib/exotel";
import { getErrorMessage } from "@/lib/errors";

const AUDIO_CALL_BEFORE_MS = 10 * 60 * 1000;
const AUDIO_CALL_AFTER_MS = 30 * 60 * 1000;

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const { appointmentId } = await context.params;
  const providerSess = await readProviderSession();
  const adminSess = providerSess ? null : await requireAdminSession();

  if (!providerSess && !adminSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { phone: true, name: true } },
      provider: { select: { phone: true, name: true } },
      slot: { select: { startsAt: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (providerSess && appointment.providerId !== providerSess.pid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.visitMode !== "AUDIO") {
    return NextResponse.json({ error: "Click-to-call is only available for audio appointments." }, { status: 400 });
  }

  const slotStart = appointment.slot?.startsAt?.getTime();
  if (!slotStart) {
    return NextResponse.json({ error: "Missing appointment time for audio call window." }, { status: 400 });
  }

  const now = Date.now();
  if (now < slotStart - AUDIO_CALL_BEFORE_MS || now > slotStart + AUDIO_CALL_AFTER_MS) {
    return NextResponse.json(
      { error: "Audio calling is only enabled 10 minutes before and 30 minutes after the appointment time." },
      { status: 400 }
    );
  }

  const patientPhone = appointment.patient?.phone;
  const providerPhone = appointment.provider?.phone;

  if (!patientPhone || !providerPhone) {
    return NextResponse.json({ error: "Missing phone numbers for patient or provider." }, { status: 400 });
  }

  try {
    const result = await initiateAudioBridge({
      from: providerPhone,
      to: patientPhone,
      context: `appointment=${appointment.id}`,
    });

    return NextResponse.json({ ok: true, call: result });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 502 });
  }
}
