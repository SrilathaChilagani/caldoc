// src/lib/patientAuth.server.ts
import { cookies } from "next/headers";

export const PATIENT_COOKIE = "patient_phone";
export const PATIENT_MAX_AGE_DAYS = 7;

/**
 * Read the current patient's phone number from the cookie.
 * Returns null if not logged in.
 */
export async function readPatientPhone(): Promise<string | null> {
  const jar = await cookies();
  const c = jar.get(PATIENT_COOKIE)?.value;
  return c || null;
}

/**
 * Clear patient cookie (logout helper).
 */
export async function clearPatientCookie() {
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, "", { path: "/", maxAge: 0 });
}


/**
 * ✅ NEW: small session helper used by /patient/appointments/[id]
 * Returns { phone } or null if not logged in.
 */
export async function readPatientSession():
  Promise<{ phone: string } | null> {
  const phone = await readPatientPhone();
  if (!phone) return null;
  return { phone };
}