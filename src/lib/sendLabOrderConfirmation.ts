import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";

const PATIENT_TEMPLATE =
  process.env.WHATSAPP_TMPL_LAB_PATIENT_CONFIRM ||
  process.env.WHATSAPP_TMPL_LAB_CONFIRM ||
  "";
const PATIENT_TEMPLATE_LANG =
  process.env.WHATSAPP_LAB_PATIENT_LANG ||
  process.env.WHATSAPP_LANG ||
  "en_US";
const ADMIN_TEMPLATE =
  process.env.WHATSAPP_TMPL_LAB_ADMIN_ALERT ||
  "";
const ADMIN_TEMPLATE_LANG =
  process.env.WHATSAPP_LAB_ADMIN_LANG ||
  process.env.WHATSAPP_LANG ||
  "en_US";

type LabConfirmationOpts = {
  orderId: string;
  patientName?: string | null;
  patientPhone?: string | null;
  patientTestsLabel?: string | null;
  patientAddressLabel?: string | null;
  adminPhone?: string | null;
};

function patientFallbackMessage(opts: LabConfirmationOpts) {
  const tests = opts.patientTestsLabel ? ` Tests: ${opts.patientTestsLabel}.` : "";
  return `Hi ${opts.patientName || "there"}, your CalDoc lab order ${opts.orderId} is confirmed.${tests} We'll reach out shortly to schedule sample collection.`;
}

function adminFallbackMessage(opts: LabConfirmationOpts) {
  const tests = opts.patientTestsLabel ? ` Tests: ${opts.patientTestsLabel}.` : "";
  const address = opts.patientAddressLabel ? ` Address: ${opts.patientAddressLabel}.` : "";
  return `Lab order ${opts.orderId} paid. Patient ${opts.patientName || "Patient"} (${opts.patientPhone || "NA"}).${tests}${address}`;
}

async function sendWithTemplateOrText(args: {
  to: string;
  template: string;
  lang: string;
  vars: (string | number)[];
  fallback: string;
}) {
  if (args.template) {
    try {
      await sendWhatsAppTemplate({
        to: args.to,
        template: args.template,
        lang: args.lang,
        vars: args.vars,
      });
      return;
    } catch (err) {
      console.error("lab confirm template error", getErrorMessage(err));
    }
  }
  await sendWhatsAppText(args.to, args.fallback);
}

export async function notifyLabOrderConfirmation(opts: LabConfirmationOpts) {
  const sends: Promise<unknown>[] = [];

  if (opts.patientPhone) {
    const vars = [
      opts.patientName || "Patient",
      opts.orderId,
      opts.patientTestsLabel || "Routine tests",
      opts.patientAddressLabel || "your location",
    ];
    sends.push(
      sendWithTemplateOrText({
        to: opts.patientPhone,
        template: PATIENT_TEMPLATE,
        lang: PATIENT_TEMPLATE_LANG,
        vars,
        fallback: patientFallbackMessage(opts),
      }).catch((err) => console.error("lab patient notify WA", getErrorMessage(err))),
    );
  }

  if (opts.adminPhone) {
    const vars = [
      opts.orderId,
      opts.patientName || "Patient",
      opts.patientPhone || "NA",
      opts.patientTestsLabel || "Routine tests",
      opts.patientAddressLabel || "NA",
    ];
    sends.push(
      sendWithTemplateOrText({
        to: opts.adminPhone,
        template: ADMIN_TEMPLATE,
        lang: ADMIN_TEMPLATE_LANG,
        vars,
        fallback: adminFallbackMessage(opts),
      }).catch((err) => console.error("lab admin notify WA", getErrorMessage(err))),
    );
  }

  await Promise.all(sends);
}
