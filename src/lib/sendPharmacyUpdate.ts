import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";

const templateName = process.env.WHATSAPP_TMPL_PHARMACY_STATUS || "pharmacy_status";

export async function sendPharmacyUpdate(opts: {
  phone?: string | null;
  patientName?: string | null;
  providerName?: string | null;
  appointmentId: string;
  status: string;
}) {
  if (!templateName || !opts.phone) return;

  const meta = buildPatientPhoneMeta(opts.phone);
  if (!meta) return;

  try {
    await sendWhatsAppTemplate({
      to: meta.canonical,
      template: templateName,
      lang: process.env.WHATSAPP_LANG || "en_US",
      vars: [opts.patientName || "Patient", opts.status, opts.providerName || "Doctor", opts.appointmentId],
    });
  } catch (err) {
    console.error("pharmacy update notification failed", getErrorMessage(err));
  }
}
