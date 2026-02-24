import jwt from "jsonwebtoken";

function getSecret() {
  const s = process.env.CHECKIN_TOKEN_SECRET || process.env.UPLOAD_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("Missing CHECKIN_TOKEN_SECRET / JWT_SECRET");
  return s;
}

type CheckInPayload = { appt: string };

/**
 * Creates a signed check-in token for a patient.
 * Expires 48 hours after the appointment slot to give patients
 * enough time to fill it before and shortly after the visit.
 */
export function createCheckinToken(appointmentId: string, slotStartsAt: Date): string {
  const expiresAt = new Date(slotStartsAt.getTime() + 48 * 60 * 60 * 1000);
  const ttlSeconds = Math.max(600, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return jwt.sign({ appt: appointmentId } satisfies CheckInPayload, getSecret(), {
    expiresIn: ttlSeconds,
  });
}

export function verifyCheckinToken(token: string): { appointmentId: string } | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as CheckInPayload;
    if (decoded?.appt) return { appointmentId: decoded.appt };
  } catch {
    return null;
  }
  return null;
}
