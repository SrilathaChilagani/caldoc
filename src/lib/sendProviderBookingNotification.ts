import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";

const PROVIDER_TEMPLATE =
  process.env.WHATSAPP_PROVIDER_TEMPLATE ||
  process.env.WHATSAPP_TMPL_PROVIDER_ALERT ||
  "WHATSAPP_PROVIDER_TEMPLATE";
const PROVIDER_FALLBACK_TEXT =
  process.env.WHATSAPP_PROVIDER_FALLBACK_TEXT ||
  "New CalDoc appointment: {patient} on {time}. Open the provider portal to confirm.";

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

type NotifyOptions = {
  appointmentId: string;
  providerPhone: string;
  providerName?: string | null;
  patientName?: string | null;
  slotStartsAt: Date;
};

export async function notifyProviderOfBooking(opts: NotifyOptions) {
  const template = PROVIDER_TEMPLATE;
  const lang = process.env.WHATSAPP_LANG || "en_US";
  const visitTime = formatIST(opts.slotStartsAt);
  const bodyPreview = `New appointment: ${opts.patientName || "Patient"} on ${visitTime}`;

  const logMessage = async (status: "SENT" | "FAILED", data: { template?: string | null; body: string; error?: string; kind: string }) =>
    prisma.outboundMessage.create({
      data: {
        appointmentId: opts.appointmentId,
        channel: "WHATSAPP",
        toPhone: opts.providerPhone,
        template: data.template ?? undefined,
        body: data.body,
        status,
        error: data.error,
        kind: data.kind,
      },
    });

  try {
    await sendWhatsAppTemplate({
      to: opts.providerPhone,
      template,
      lang,
      vars: [opts.providerName || "Doctor", opts.patientName || "Patient", visitTime],
    });
    await logMessage("SENT", { template, body: bodyPreview, kind: "PROVIDER_NEW_APPT" });
    return;
  } catch (err) {
    await logMessage("FAILED", {
      template,
      body: bodyPreview,
      error: getErrorMessage(err),
      kind: "PROVIDER_NEW_APPT",
    });
  }

  const fallbackBody = PROVIDER_FALLBACK_TEXT.replace("{patient}", opts.patientName || "Patient").replace(
    "{time}",
    visitTime,
  );

  try {
    await sendWhatsAppText(opts.providerPhone, fallbackBody);
    await logMessage("SENT", { template: null, body: fallbackBody, kind: "PROVIDER_NEW_APPT_FALLBACK" });
  } catch (fallbackErr) {
    await logMessage("FAILED", {
      template: null,
      body: fallbackBody,
      error: getErrorMessage(fallbackErr),
      kind: "PROVIDER_NEW_APPT_FALLBACK",
    });
    throw fallbackErr;
  }
}
