import jwt from "jsonwebtoken";

const DEFAULT_TTL_MINUTES = Number(process.env.PROVIDER_CONFIRM_TTL_MINUTES || 24 * 60);

function getSecret() {
  const secret = process.env.PROVIDER_CONFIRM_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing PROVIDER_CONFIRM_SECRET or JWT_SECRET");
  }
  return secret;
}

type ProviderConfirmPayload = {
  appt: string;
  prov: string;
};

export function createProviderConfirmToken(opts: {
  appointmentId: string;
  providerId: string;
  ttlMinutes?: number;
}) {
  const ttl = Math.max(30, opts.ttlMinutes ?? DEFAULT_TTL_MINUTES);
  return jwt.sign({ appt: opts.appointmentId, prov: opts.providerId }, getSecret(), {
    expiresIn: `${ttl}m`,
  });
}

export function verifyProviderConfirmToken(token?: string | null) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getSecret()) as ProviderConfirmPayload;
    if (decoded?.appt && decoded?.prov) {
      return { appointmentId: decoded.appt, providerId: decoded.prov };
    }
  } catch {
    return null;
  }
  return null;
}
