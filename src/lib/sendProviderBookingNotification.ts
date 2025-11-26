import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";

const PROVIDER_TEMPLATE =
  process.env.WHATSAPP_PROVIDER_TEMPLATE ||
  process.env.WHATSAPP_TMPL_PROVIDER_ALERT ||
  "provider_booking_alert";

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

  try {
    await sendWhatsAppTemplate({
      to: opts.providerPhone,
      template,
      lang,
      vars: [opts.providerName || "Doctor", opts.patientName || "Patient", visitTime],
    });

    await prisma.outboundMessage.create({
      data: {
        appointmentId: opts.appointmentId,
        channel: "WHATSAPP",
        toPhone: opts.providerPhone,
        template,
        body: bodyPreview,
        status: "SENT",
        kind: "PROVIDER_NEW_APPT",
      },
    });
  } catch (err) {
    await prisma.outboundMessage.create({
      data: {
        appointmentId: opts.appointmentId,
        channel: "WHATSAPP",
        toPhone: opts.providerPhone,
        template,
        body: bodyPreview,
        status: "FAILED",
        error: getErrorMessage(err),
        kind: "PROVIDER_NEW_APPT",
      },
    });
    throw err;
  }
}
