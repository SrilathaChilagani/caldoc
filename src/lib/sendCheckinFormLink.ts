import { sendWhatsAppTemplate, sendWhatsAppText } from "./whatsapp";
import { prisma } from "./db";
import { createCheckinToken } from "./checkinToken";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

const TMPL = process.env.WHATSAPP_TMPL_CHECKIN || "appointment_checkin";

export async function sendCheckinFormLink(opts: {
  appointmentId: string;
  patientPhone: string;
  patientName: string;
  slotStartsAt: Date;
  kind?: string;
}) {
  const { appointmentId, patientPhone, patientName, slotStartsAt } = opts;
  const kind = opts.kind ?? "PATIENT_CHECKIN_LINK";

  const token = createCheckinToken(appointmentId, slotStartsAt);
  const link = `${appBaseUrl()}/checkin/${token}`;
  const firstName = (patientName || "there").split(" ")[0];

  const fallback = [
    `Hi ${firstName}! Please take 2 minutes to complete your pre-visit check-in form before your appointment.`,
    `The form helps your doctor review your medical history and current symptoms in advance.`,
    `\nFill it here: ${link}`,
  ].join(" ");

  let messageId: string | undefined;
  let status: "SENT" | "FAILED" = "SENT";
  let errorMsg: string | undefined;

  try {
    let result: { messageId?: string } | undefined;
    try {
      result = await sendWhatsAppTemplate({
        to: patientPhone,
        template: TMPL,
        vars: [firstName, link],
      });
    } catch (tmplErr) {
      // If template fails (not yet approved), fall back to plain text
      console.warn("[checkin] template failed, sending plain text:", tmplErr);
      result = await sendWhatsAppText(patientPhone, fallback);
    }
    messageId = result?.messageId;
  } catch (err) {
    status = "FAILED";
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[sendCheckinFormLink] failed:", errorMsg);
  }

  try {
    await prisma.outboundMessage.create({
      data: {
        appointmentId,
        channel: "WHATSAPP",
        toPhone: patientPhone,
        template: TMPL,
        body: fallback,
        messageId,
        status,
        error: errorMsg,
        kind,
      },
    });
  } catch (logErr) {
    console.error("[sendCheckinFormLink] logging failed:", logErr);
  }
}
