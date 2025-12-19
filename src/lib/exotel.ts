const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID;
const EXOTEL_CALLER_ID = process.env.EXOTEL_CALLER_ID;

export type ClickToCallResult = {
  slice?: string;
  [key: string]: unknown;
};

export async function initiateAudioBridge(opts: { from: string; to: string; context?: string }) {
  if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_ACCOUNT_SID || !EXOTEL_CALLER_ID) {
    throw new Error("Missing Exotel credentials. Please set EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID, and EXOTEL_CALLER_ID.");
  }

  const endpoint = `https://api.exotel.com/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls/connect`;
  const authHeader = `Basic ${Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString("base64")}`;
  const payload = new URLSearchParams({
    From: opts.from,
    To: opts.to,
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
