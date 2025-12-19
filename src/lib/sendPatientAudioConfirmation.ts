import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";

const PATIENT_AUDIO_TEMPLATE =
  process.env.WHATSAPP_TMPL_PATIENT_AUDIO_CONFIRM || "appointment_audio_confirm";
const PATIENT_AUDIO_TEMPLATE_LANG =
  process.env.WHATSAPP_PATIENT_AUDIO_LANG ||
  process.env.WHATSAPP_LANG ||
  "en_US";
const PATIENT_AUDIO_FALLBACK_TEXT =
  process.env.PATIENT_AUDIO_FALLBACK_TEXT ||
  "Hi {patient}, Dr. {provider} will call you around {time} from CalDoc. Keep your phone handy. Need to check details? {portal}";

type AudioNotifyOpts = {
  appointmentId: string;
  patientPhone: string;
  patientName?: string | null;
  providerName?: string | null;
  slotStartsAt: Date;
};

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
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://caldoc.in"
  );
}

export async function sendPatientAudioConfirmation(opts: AudioNotifyOpts) {
  const visitTime = formatIST(opts.slotStartsAt);
  const baseUrl = appBaseUrl();
  const portalUrl = `${baseUrl}/patient/appointments/${opts.appointmentId}`;

  const logMessage = async (
    status: "SENT" | "FAILED",
    body: string,
    template: string | null,
    kind: string,
    messageId?: string,
    error?: string,
  ) =>
    prisma.outboundMessage.create({
      data: {
        appointmentId: opts.appointmentId,
        channel: "WHATSAPP",
        toPhone: opts.patientPhone,
        template: template || undefined,
        body,
        messageId: messageId || undefined,
        status,
        error,
        kind,
      },
    });

  if (PATIENT_AUDIO_TEMPLATE) {
    try {
      const result = await sendWhatsAppTemplate({
        to: opts.patientPhone,
        template: PATIENT_AUDIO_TEMPLATE,
        lang: PATIENT_AUDIO_TEMPLATE_LANG,
        vars: [
          opts.patientName || "Patient",
          opts.providerName || "your doctor",
          visitTime,
          portalUrl,
        ],
      });
      await logMessage(
        "SENT",
        `Audio consultation confirmed for ${visitTime}`,
        PATIENT_AUDIO_TEMPLATE,
        "PATIENT_AUDIO_CONFIRM",
        result?.messageId,
      );
      return;
    } catch (err) {
      await logMessage(
        "FAILED",
        `Audio consultation confirmed for ${visitTime}`,
        PATIENT_AUDIO_TEMPLATE,
        "PATIENT_AUDIO_CONFIRM",
        undefined,
        getErrorMessage(err),
      );
    }
  }

  const fallback = PATIENT_AUDIO_FALLBACK_TEXT
    .replace("{patient}", opts.patientName || "Patient")
    .replace("{provider}", opts.providerName || "your doctor")
    .replace("{time}", visitTime)
    .replace("{portal}", portalUrl);

  try {
    const result = await sendWhatsAppText(opts.patientPhone, fallback);
    await logMessage("SENT", fallback, null, "PATIENT_AUDIO_CONFIRM_FALLBACK", result?.messageId);
  } catch (err) {
    await logMessage(
      "FAILED",
      fallback,
      null,
      "PATIENT_AUDIO_CONFIRM_FALLBACK",
      undefined,
      getErrorMessage(err),
    );
  }
}
