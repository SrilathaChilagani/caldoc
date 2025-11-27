// src/lib/whatsapp.ts
/**
 * Lightweight WhatsApp Cloud API client
 * - Normalizes phone numbers to E.164 (adds +91 for common Indian inputs)
 * - Supports per-message language override (defaults from env)
 *
 * Required env:
 *   WABA_ID=xxxxxxxxxxxxxxxx
 *   WHATSAPP_TOKEN=EAAG...
 * Optional:
 *   WHATSAPP_LANG=en_US
 */

const WABA_ID = process.env.WABA_ID!;
const WA_TOKEN = process.env.WHATSAPP_TOKEN!;
const WA_DEFAULT_LANG = process.env.WHATSAPP_LANG || "en_US";

type SendTemplateOpts = {
  to: string;                     // phone number; various formats accepted
  template: string;               // WhatsApp template name
  vars?: (string | number)[];     // template body variables
  lang?: string;                  // e.g., "en_US" (defaults to env)
};

type TemplateComponent = {
  type: "body";
  parameters: { type: "text"; text: string }[];
};

type TemplatePayload = {
  name: string;
  language: { code: string };
  components?: TemplateComponent[];
};

/** Convert common inputs to strict E.164 or return "" if invalid. */
function normalizePhone(input?: string): string {
  if (!input) return "";
  let p = input.trim();

  // If exactly 10 digits (common Indian mobile): add +91
  if (/^\d{10}$/.test(p)) p = `+91${p}`;

  // If starts with 0 then 10 digits (e.g., 0XXXXXXXXXX): drop 0, add +91
  if (/^0\d{10}$/.test(p)) p = `+91${p.slice(1)}`;

  // If only digits with country code but missing '+', add it
  if (/^\d{6,15}$/.test(p)) p = `+${p}`;

  // Final E.164 check
  if (!/^\+\d{6,15}$/.test(p)) return "";
  return p;
}

/**
 * Send a template message via WhatsApp Cloud API.
 * Throws an Error if the API returns non-2xx.
 */
export async function sendWhatsAppTemplate(opts: SendTemplateOpts) {
  if (!WABA_ID || !WA_TOKEN) {
    throw new Error("Missing WABA_ID/WHATSAPP_TOKEN in environment");
  }

  const to = normalizePhone(opts.to);
  if (!to) {
    throw new Error("Recipient phone missing/invalid (must be E.164, e.g. +9198XXXXXXXX)");
  }

  const parameters = (opts.vars ?? []).map(
    (v): TemplateComponent["parameters"][number] => ({ type: "text", text: String(v) })
  );

  // Build template WITHOUT spreading an array into the object
  const template: TemplatePayload = {
    name: opts.template,
    language: { code: opts.lang || WA_DEFAULT_LANG },
  };
  if (parameters.length) {
    template.components = [{ type: "body", parameters }];
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template,
  };

  const res = await fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    // Keep full structure for troubleshooting (template name/lang/phone issues)
    console.error("WA API error:", JSON.stringify(json, null, 2));
    const msg = json?.error?.error_user_msg || json?.error?.message || "WhatsApp send failed";
    throw new Error(msg);
  }

  return json;
}

/** Optional helper to send plain text (useful for quick debugging). */
export async function sendWhatsAppText(toRaw: string, text: string) {
  if (!WABA_ID || !WA_TOKEN) {
    throw new Error("Missing WABA_ID/WHATSAPP_TOKEN in environment");
  }
  const to = normalizePhone(toRaw);
  if (!to) throw new Error("Recipient phone missing/invalid");

  const res = await fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error("WA API error:", JSON.stringify(json, null, 2));
    const msg = json?.error?.error_user_msg || json?.error?.message || "WhatsApp text send failed";
    throw new Error(msg);
  }
  return json;
}
