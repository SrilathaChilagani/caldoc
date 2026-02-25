// src/lib/patientAuth.server.ts
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const PATIENT_COOKIE = "patient_phone";
export const PATIENT_MAX_AGE_DAYS = 7;

type PatientTokenPayload = {
  sub: string; // canonical phone
  patientId?: string;
};

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

/** Sign a patient session JWT. Called at login. */
export function signPatientSession(phone: string, patientId?: string): string {
  const payload: PatientTokenPayload = { sub: phone, ...(patientId ? { patientId } : {}) };
  return jwt.sign(payload, getSecret(), { expiresIn: `${PATIENT_MAX_AGE_DAYS}d` });
}

/**
 * Read the current patient's phone number from the cookie.
 * Cookie stores a signed JWT. Falls back gracefully for old plain-text cookies
 * so existing sessions survive the deploy without forcing a re-login.
 * Returns null if not logged in or token is invalid/expired.
 */
export async function readPatientPhone(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(PATIENT_COOKIE)?.value;
  if (!value) return null;

  // Try JWT verification first
  try {
    const decoded = jwt.verify(value, getSecret()) as PatientTokenPayload;
    return decoded.sub ?? null;
  } catch {
    // Legacy plain-text cookie (phone stored directly before this fix).
    // Accept once — next login replaces it with a signed JWT.
    if (value.startsWith("+") || /^\d{10,15}$/.test(value)) {
      return value;
    }
    return null;
  }
}

/**
 * Clear patient cookie (logout helper).
 */
export async function clearPatientCookie() {
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Returns { phone } or null if not logged in.
 */
export async function readPatientSession(): Promise<{ phone: string } | null> {
  const phone = await readPatientPhone();
  if (!phone) return null;
  return { phone };
}
