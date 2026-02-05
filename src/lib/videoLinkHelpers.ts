import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";

const AUTO_ROOM_WINDOW_MS = Number(
  process.env.AUTO_VIDEO_ROOM_WINDOW_MS || 24 * 60 * 60 * 1000,
);

const PATIENT_VIDEO_TEMPLATE =
  process.env.WHATSAPP_TMPL_PATIENT_VIDEO_LINK ||
  process.env.WHATSAPP_TMPL_VIDEO_LINK ||
  "appointment_video_link";
const PROVIDER_VIDEO_TEMPLATE =
  process.env.WHATSAPP_TMPL_PROVIDER_VIDEO_LINK ||
  process.env.WHATSAPP_TMPL_PROVIDER_VIDEO ||
  "provider_video_link";

export async function ensureVideoRoomIfNeeded(
  appointmentId: string,
  opts: {
    visitMode?: string | null;
    videoRoom?: string | null;
    slotStartsAt?: Date | null;
    forceImmediate?: boolean;
  },
  baseUrl: string,
) {
  if (opts.visitMode === "AUDIO") return opts.videoRoom;
  if (opts.videoRoom) return opts.videoRoom;
  const startsAt = opts.slotStartsAt;
  if (!startsAt) return opts.videoRoom;
  const msUntilStart = startsAt.getTime() - Date.now();
  if (!opts.forceImmediate && msUntilStart > AUTO_ROOM_WINDOW_MS) return opts.videoRoom;

  const roomUrl = `${baseUrl}/room/${appointmentId}`;
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { videoRoom: roomUrl },
  });
  return roomUrl;
}

export async function notifyVideoLinks(
  appt: {
    id: string;
    visitMode: string | null;
    videoRoom: string | null;
    slotStartsAt?: Date | null;
    patientName?: string | null;
    patient?: { phone: string | null; name?: string | null } | null;
    provider?: { phone?: string | null; name?: string | null } | null;
  },
  link: string | null | undefined,
  opts?: { notifyPatient?: boolean; notifyProvider?: boolean },
) {
  if (appt.visitMode === "AUDIO" || !link) return;
  const notifyPatient = opts?.notifyPatient ?? true;
  const notifyProvider = opts?.notifyProvider ?? true;
  const lang = process.env.WHATSAPP_LANG || "en_US";
  const visitTimeLabel = appt.slotStartsAt
    ? appt.slotStartsAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "your scheduled time";

  const logMessage = async (
    recipient: "PATIENT" | "PROVIDER",
    status: "SENT" | "FAILED",
    body: string,
    template: string,
    messageId?: string,
    error?: string,
  ) => {
    const targetPhone = recipient === "PATIENT" ? appt.patient?.phone : appt.provider?.phone;
    if (!targetPhone) return;
    await prisma.outboundMessage.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        toPhone: targetPhone,
        template,
        body,
        messageId: messageId || undefined,
        status,
        error,
        kind: `${recipient}_VIDEO_LINK`,
      },
    });
  };

  const displayName = appt.patientName || appt.patient?.name || "Patient";

  if (notifyPatient && appt.patient?.phone && PATIENT_VIDEO_TEMPLATE) {
    const body = `Video link: ${link}`;
    try {
      const result = await sendWhatsAppTemplate({
        to: appt.patient.phone,
        template: PATIENT_VIDEO_TEMPLATE,
        lang,
        vars: [displayName, link, visitTimeLabel, appt.provider?.name || "Doctor"],
      });
      await logMessage("PATIENT", "SENT", body, PATIENT_VIDEO_TEMPLATE, result?.messageId);
    } catch (err) {
      await logMessage("PATIENT", "FAILED", body, PATIENT_VIDEO_TEMPLATE, undefined, getErrorMessage(err));
    }
  }

  if (notifyProvider && appt.provider?.phone && PROVIDER_VIDEO_TEMPLATE) {
    const body = `Video room ready: ${link}`;
    try {
      const result = await sendWhatsAppTemplate({
        to: appt.provider.phone,
        template: PROVIDER_VIDEO_TEMPLATE,
        lang,
        vars: [appt.provider.name || "Doctor", link, visitTimeLabel, displayName],
      });
      await logMessage("PROVIDER", "SENT", body, PROVIDER_VIDEO_TEMPLATE, result?.messageId);
    } catch (err) {
      await logMessage("PROVIDER", "FAILED", body, PROVIDER_VIDEO_TEMPLATE, undefined, getErrorMessage(err));
    }
  }
}

const PATIENT_VIDEO_CONFIRM_TEMPLATE =
  process.env.WHATSAPP_TMPL_PATIENT_VIDEO_24 ||
  process.env.WHATSAPP_TMPL_APPT_REMINDER_24H ||
  process.env.WHATSAPP_APPOINTMENT_REMINDER_24H ||
  "appointment_reminder_24hr";

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

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

export async function sendPatientVideoConfirmation(
  appt: {
    id: string;
    visitMode: string | null;
    slotStartsAt?: Date | null;
    slot?: { startsAt?: Date | null } | null;
    patientName?: string | null;
    patient?: { phone: string | null; name?: string | null } | null;
    provider?: { name?: string | null } | null;
  },
  link: string | null | undefined,
) {
  if (appt.visitMode === "AUDIO" || !link) return;
  const patientPhone = appt.patient?.phone;
  const slotStartsAt = appt.slot?.startsAt ?? appt.slotStartsAt ?? null;
  if (!patientPhone || !slotStartsAt) return;

  const baseUrl = appBaseUrl();
  const rescheduleLink = `${baseUrl}/patient/appointments/${appt.id}`;
  const joinLink = link;
  const visitTimeLabel = formatIST(slotStartsAt);
  const patientFirstName = (appt.patientName || appt.patient?.name || "there").split(" ")[0];
  const providerName = appt.provider?.name || "your doctor";

  const body = `Video link: ${joinLink}`;
  try {
    const result = await sendWhatsAppTemplate({
      to: patientPhone,
      template: PATIENT_VIDEO_CONFIRM_TEMPLATE,
      lang: process.env.WHATSAPP_LANG || "en_US",
      vars: [patientFirstName, joinLink, visitTimeLabel, rescheduleLink, providerName],
    });
    await prisma.outboundMessage.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        toPhone: patientPhone,
        template: PATIENT_VIDEO_CONFIRM_TEMPLATE,
        body,
        messageId: result?.messageId ?? undefined,
        status: "SENT",
        kind: "APPT_REMINDER_24H",
      },
    });
  } catch (err) {
    await prisma.outboundMessage.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        toPhone: patientPhone,
        template: PATIENT_VIDEO_CONFIRM_TEMPLATE,
        body,
        status: "FAILED",
        error: getErrorMessage(err),
        kind: "APPT_REMINDER_24H",
      },
    });
  }
}
