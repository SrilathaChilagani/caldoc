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
  opts: { visitMode?: string | null; videoRoom?: string | null; slotStartsAt?: Date | null },
  baseUrl: string,
) {
  if (opts.visitMode === "AUDIO") return opts.videoRoom;
  if (opts.videoRoom) return opts.videoRoom;
  const startsAt = opts.slotStartsAt;
  if (!startsAt) return opts.videoRoom;
  const msUntilStart = startsAt.getTime() - Date.now();
  if (msUntilStart > AUTO_ROOM_WINDOW_MS) return opts.videoRoom;

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
    patient?: { phone: string | null; name?: string | null } | null;
    provider?: { phone?: string | null; name?: string | null } | null;
  },
  link: string | null | undefined,
) {
  if (appt.visitMode === "AUDIO" || !link) return;
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
        status,
        error,
        kind: `${recipient}_VIDEO_LINK`,
      },
    });
  };

  if (appt.patient?.phone && PATIENT_VIDEO_TEMPLATE) {
    const body = `Video link: ${link}`;
    try {
      await sendWhatsAppTemplate({
        to: appt.patient.phone,
        template: PATIENT_VIDEO_TEMPLATE,
        lang,
        vars: [appt.patient.name || "Patient", link, visitTimeLabel, appt.provider?.name || "Doctor"],
      });
      await logMessage("PATIENT", "SENT", body, PATIENT_VIDEO_TEMPLATE);
    } catch (err) {
      await logMessage("PATIENT", "FAILED", body, PATIENT_VIDEO_TEMPLATE, getErrorMessage(err));
    }
  }

  if (appt.provider?.phone && PROVIDER_VIDEO_TEMPLATE) {
    const body = `Video room ready: ${link}`;
    try {
      await sendWhatsAppTemplate({
        to: appt.provider.phone,
        template: PROVIDER_VIDEO_TEMPLATE,
        lang,
        vars: [appt.provider.name || "Doctor", link, visitTimeLabel, appt.patient?.name || "Patient"],
      });
      await logMessage("PROVIDER", "SENT", body, PROVIDER_VIDEO_TEMPLATE);
    } catch (err) {
      await logMessage("PROVIDER", "FAILED", body, PROVIDER_VIDEO_TEMPLATE, getErrorMessage(err));
    }
  }
}
