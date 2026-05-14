import twilio from "twilio";

type SendResult = { sid: string; status: string };
type CheckResult = { status: string; valid: boolean };

let cachedClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)");
  }
  if (!cachedClient) cachedClient = twilio(sid, token);
  return cachedClient;
}

function getServiceSid() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) throw new Error("TWILIO_VERIFY_SERVICE_SID missing");
  return serviceSid;
}

/**
 * Send an SMS OTP to the given E.164 phone (e.g. "+919876543210", "+12025550123").
 * Twilio generates, sends, and tracks the code internally.
 */
export async function sendVerificationSms(toE164: string): Promise<SendResult> {
  const client = getClient();
  const verification = await client.verify.v2
    .services(getServiceSid())
    .verifications.create({ to: toE164, channel: "sms" });
  return { sid: verification.sid, status: verification.status };
}

/**
 * Check a code against the most recent verification for this phone.
 * Returns valid=true only when Twilio reports status "approved".
 */
export async function checkVerificationCode(toE164: string, code: string): Promise<CheckResult> {
  const client = getClient();
  const check = await client.verify.v2
    .services(getServiceSid())
    .verificationChecks.create({ to: toE164, code });
  return { status: check.status, valid: check.status === "approved" };
}
