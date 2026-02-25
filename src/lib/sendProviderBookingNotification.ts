import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";
import { createProviderConfirmToken } from "@/lib/providerConfirmToken";

// Set WHATSAPP_PROVIDER_TEMPLATE to the approved template name in your Meta WABA.
const PROVIDER_TEMPLATE =
  process.env.WHATSAPP_PROVIDER_TEMPLATE ||
  process.env.WHATSAPP_TMPL_PROVIDER_ALERT ||
  "provider_booking_alert";
const PROVIDER_TEMPLATE_LANG =
  process.env.WHATSAPP_PROVIDER_TEMPLATE_LANG ||
  process.env.WHATSAPP_LANG ||
  "en_US";
const PROVIDER_FALLBACK_TEXT =
  process.env.WHATSAPP_PROVIDER_FALLBACK_TEXT ||
  "New CalDoc appointment: {patient} on {time}. Confirm: {confirm} — Portal: {portal}";

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://caldoc.in"
  );
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

type NotifyOptions = {
  appointmentId: string;
  providerPhone: string;
  providerId: string;
  providerName?: string | null;
  patientName?: string | null;
  slotStartsAt: Date;
};

export async function notifyProviderOfBooking(opts: NotifyOptions) {
  const template = PROVIDER_TEMPLATE;
  const visitTime = formatIST(opts.slotStartsAt);
  const bodyPreview = `New appointment: ${opts.patientName || "Patient"} on ${visitTime}`;
  const baseUrl = appBaseUrl();
  const token = createProviderConfirmToken({ appointmentId: opts.appointmentId, providerId: opts.providerId });
  const confirmUrl = `${baseUrl}/provider/confirm?token=${encodeURIComponent(token)}`;
  const portalUrl = `${baseUrl}/provider/login?redirect=${encodeURIComponent(`/provider/appointments/${opts.appointmentId}`)}`;

  const bodyComponent = {
    type: "body" as const,
    parameters: [
      { type: "text" as const, text: opts.providerName || "Doctor" },
      { type: "text" as const, text: opts.patientName || "Patient" },
      { type: "text" as const, text: visitTime },
    ],
  };

  const buttonComponents = [
    {
      type: "button" as const,
      sub_type: "url" as const,
      index: "0",
      parameters: [{ type: "text" as const, text: token }],
    },
  ];

  const components = [bodyComponent, ...buttonComponents];

  const logMessage = async (status: "SENT" | "FAILED", data: { template?: string | null; body: string; error?: string; kind: string; messageId?: string | null }) =>
    prisma.outboundMessage.create({
      data: {
        appointmentId: opts.appointmentId,
        channel: "WHATSAPP",
        toPhone: opts.providerPhone,
        template: data.template ?? undefined,
        body: data.body,
        messageId: data.messageId ?? undefined,
        status,
        error: data.error,
        kind: data.kind,
      },
    });

  try {
    const result = await sendWhatsAppTemplate({
      to: opts.providerPhone,
      template,
      lang: PROVIDER_TEMPLATE_LANG,
      components,
    });
    await logMessage("SENT", { template, body: bodyPreview, kind: "PROVIDER_NEW_APPT", messageId: result?.messageId || null });
    return;
  } catch (err) {
    await logMessage("FAILED", {
      template,
      body: bodyPreview,
      error: getErrorMessage(err),
      messageId: null,
      kind: "PROVIDER_NEW_APPT",
    });
  }

  const fallbackBody = PROVIDER_FALLBACK_TEXT.replace("{patient}", opts.patientName || "Patient")
    .replace("{time}", visitTime)
    .replace("{confirm}", confirmUrl)
    .replace("{portal}", portalUrl);

  try {
    const result = await sendWhatsAppText(opts.providerPhone, fallbackBody);
    await logMessage("SENT", { template: null, body: fallbackBody, kind: "PROVIDER_NEW_APPT_FALLBACK", messageId: result?.messageId || null });
  } catch (fallbackErr) {
    await logMessage("FAILED", {
      template: null,
      body: fallbackBody,
      error: getErrorMessage(fallbackErr),
      messageId: null,
      kind: "PROVIDER_NEW_APPT_FALLBACK",
    });
    throw fallbackErr;
  }
}
