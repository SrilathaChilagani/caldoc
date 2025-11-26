import jwt from "jsonwebtoken";

const DEFAULT_TTL_MINUTES = Number(process.env.UPLOAD_TOKEN_TTL_MINUTES || 1440);

function getSecret() {
  const secret = process.env.UPLOAD_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing UPLOAD_TOKEN_SECRET or JWT_SECRET");
  }
  return secret;
}

type UploadTokenPayload = {
  appt: string;
  pat: string;
};

export function createPatientUploadToken(opts: {
  appointmentId: string;
  patientId: string;
  ttlMinutes?: number;
}) {
  const ttl = Math.max(15, opts.ttlMinutes ?? DEFAULT_TTL_MINUTES);
  return jwt.sign(
    { appt: opts.appointmentId, pat: opts.patientId },
    getSecret(),
    { expiresIn: `${ttl}m` }
  );
}

export function verifyPatientUploadToken(token: string) {
  try {
    const decoded = jwt.verify(token, getSecret()) as UploadTokenPayload;
    if (decoded?.appt && decoded?.pat) {
      return { appointmentId: decoded.appt, patientId: decoded.pat };
    }
  } catch {
    return null;
  }
  return null;
}
