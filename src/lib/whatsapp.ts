// src/lib/whatsapp.ts
/**
 * Lightweight WhatsApp Cloud API client
 * - Normalizes phone numbers to E.164 (adds +91 for common Indian inputs)
 * - Supports per-message language override (defaults from env)
 *
 * Required env:
 *   WA_PHONE_NUMBER_ID=xxxxxxxxxxxxxxxx  ← Phone Number ID from Meta Business Manager
 *                                          (NOT the WABA/Business Account ID)
 *   WHATSAPP_TOKEN=EAAG...
 * Optional:
 *   WHATSAPP_LANG=en_US
 */

// Meta Cloud API uses Phone Number ID in the endpoint path, NOT the WABA ID.
// Find it in Meta Business Manager → WhatsApp → API Setup → Phone Number ID.
const WABA_ID = process.env.WA_PHONE_NUMBER_ID || process.env.WABA_ID!;
const WA_TOKEN = process.env.WHATSAPP_TOKEN!;
const WA_DEFAULT_LANG = process.env.WHATSAPP_LANG || "en_US";

type SendTemplateOpts = {
  to: string;                     // phone number; various formats accepted
  template: string;               // WhatsApp template name
  vars?: (string | number)[];     // template body variables
  lang?: string;                  // e.g., "en_US" (defaults to env)
  components?: TemplateComponent[]; // custom components (buttons, header, etc.)
};

type BodyComponent = {
  type: "body";
  parameters: { type: "text"; text: string }[];
};

type ButtonComponent = {
  type: "button";
  sub_type: "url";
  index: string;
  parameters: { type: "text"; text: string }[];
};

type TemplateComponent = BodyComponent | ButtonComponent;

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

function buildMetaError(json: unknown, fallback: string, status: number) {
  const metaError = (json as { error?: Record<string, unknown> })?.error;
  if (!metaError) {
    return new Error(`${fallback} (status ${status})`);
  }
  const code = metaError.code ? `code=${metaError.code}` : "";
  const subcode = metaError.error_subcode ? `subcode=${metaError.error_subcode}` : "";
  const type = metaError.type ? `type=${metaError.type}` : "";
  const fbtrace = metaError.fbtrace_id ? `fbtrace=${metaError.fbtrace_id}` : "";
  const tags = [code, subcode, type, fbtrace].filter(Boolean).join(" ");
  const userMsg =
    (metaError.error_user_msg as string | undefined) ||
    (metaError.message as string | undefined) ||
    fallback;
  const detail = tags ? `${userMsg} [${tags}]` : userMsg;
  return new Error(`${detail} :: ${JSON.stringify(metaError)}`);
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

  const bodyParameters = (opts.vars ?? []).map(
    (v): BodyComponent["parameters"][number] => ({ type: "text", text: String(v) })
  );

  const template: TemplatePayload = {
    name: opts.template,
    language: { code: opts.lang || WA_DEFAULT_LANG },
  };
  if (opts.components && opts.components.length) {
    template.components = opts.components;
  } else if (bodyParameters.length) {
    template.components = [{ type: "body", parameters: bodyParameters }];
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
    console.error("WA API error:", JSON.stringify(json, null, 2));
    throw buildMetaError(json, "WhatsApp send failed", res.status);
  }

  const messageId = json?.messages?.[0]?.id;
  if (messageId) {
    console.info(
      "[WA] template sent",
      JSON.stringify({
        template: opts.template,
        lang: template.language.code,
        to,
        messageId,
      }),
    );
  }

  return { ...json, messageId };
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
    throw buildMetaError(json, "WhatsApp text send failed", res.status);
  }
  const messageId = json?.messages?.[0]?.id;
  if (messageId) {
    console.info("[WA] text sent", JSON.stringify({ to, messageId }));
  }
  return { ...json, messageId };
}
