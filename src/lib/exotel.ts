const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID;
const EXOTEL_CALLER_ID = process.env.EXOTEL_CALLER_ID;
// SMS sender ID — register a 6-char DLT sender ID in your Exotel dashboard, e.g. "CALDOC"
const EXOTEL_SMS_FROM = process.env.EXOTEL_SMS_FROM || EXOTEL_CALLER_ID;

export type ClickToCallResult = {
  slice?: string;
  [key: string]: unknown;
};

function normalizeIndianNumber(raw: string, label: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    throw new Error(`Missing ${label} phone number.`);
  }
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) {
    throw new Error("International (ISD) calling is disabled for Exotel. Use an Indian number or enable ISD.");
  }
  return digits;
}

/**
 * Send an SMS via Exotel.
 * Requires EXOTEL_SMS_FROM to be set — a DLT-registered sender ID (e.g. "CALDOC")
 * or your ExoPhone number registered for SMS in the Exotel dashboard.
 */
export async function sendSms(to: string, body: string) {
  if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_ACCOUNT_SID || !EXOTEL_SMS_FROM) {
    throw new Error("Missing Exotel SMS credentials (EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID, EXOTEL_SMS_FROM)");
  }

  const toNorm = normalizeIndianNumber(to, "recipient");
  const endpoint = `https://api.exotel.com/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Sms/send`;
  const authHeader = `Basic ${Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString("base64")}`;
  const payload = new URLSearchParams({
    From: EXOTEL_SMS_FROM,
    To: toNorm,
    Body: body,
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Exotel SMS failed (${res.status}): ${text || res.statusText}`);
  }

  const json = await res.json().catch(() => ({}));
  console.info("[Exotel SMS] sent", JSON.stringify({ to: toNorm, sid: json?.SMSMessage?.Sid }));
  return json;
}

export async function initiateAudioBridge(opts: { from: string; to: string; context?: string }) {
  if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_ACCOUNT_SID || !EXOTEL_CALLER_ID) {
    throw new Error("Missing Exotel credentials. Please set EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID, and EXOTEL_CALLER_ID.");
  }

  const from = normalizeIndianNumber(opts.from, "provider");
  const to = normalizeIndianNumber(opts.to, "patient");

  const endpoint = `https://api.exotel.com/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls/connect`;
  const authHeader = `Basic ${Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString("base64")}`;
  const payload = new URLSearchParams({
    From: from,
    To: to,
    CallerId: EXOTEL_CALLER_ID,
    CallType: "trans",
  });

  if (opts.context) {
    payload.append("CallDetails", opts.context);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Exotel call failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json() as Promise<ClickToCallResult>;
}
