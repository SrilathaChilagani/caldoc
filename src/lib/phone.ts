export type PatientPhoneMeta = {
  canonical: string;
  digits: string;
  last10: string;
  masked: string;
};

/**
 * Normalises a phone number for storage and lookup.
 *
 * Indian numbers (6–9 start, 10 digits) → `+91XXXXXXXXXX`
 * International numbers with `+` prefix   → `+{digits}`
 * 11–15 digit numbers without `+`          → `+{digits}` (assumed country-code included)
 *
 * Returns null only for clearly invalid input (< 7 digits, > 15 digits, or
 * an ambiguous short number with no country-code signal).
 */
export function buildPatientPhoneMeta(raw: string): PatientPhoneMeta | null {
  const cleaned = (raw || "").trim();
  if (!cleaned) return null;

  const digits = cleaned.replace(/\D/g, "");

  // E.164 hard limits: 7–15 significant digits
  if (digits.length < 7 || digits.length > 15) return null;

  const last10 = digits.slice(-10);

  // ── Indian number detection (all existing formats preserved) ────────────
  let indian10: string | null = null;

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    // 9876543210  (bare 10-digit Indian number)
    indian10 = digits;
  } else if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    // 09876543210
    indian10 = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    // 919876543210  or  +91 9876543210
    indian10 = digits.slice(2);
  }

  if (indian10) {
    return {
      canonical: `+91${indian10}`,
      digits,
      last10: indian10,
      masked: `+91-••••${indian10.slice(-4)}`,
    };
  }

  // ── International number ─────────────────────────────────────────────────
  // Require either a leading `+` or at least 11 digits (implying a country code
  // is included, e.g. 12025551234 for a US number).  Pure 10-digit numbers
  // that didn't match the Indian pattern are too ambiguous — reject them so
  // callers can prompt for the full international format.
  const hasPlus = cleaned.startsWith("+");

  if (!hasPlus && digits.length < 11) {
    return null;
  }

  const canonical = `+${digits}`;
  // Mask all but the last 4 digits
  const masked =
    canonical.length > 5
      ? canonical.slice(0, -4).replace(/[0-9]/g, "•") + canonical.slice(-4)
      : canonical;

  return {
    canonical,
    digits,
    last10,
    masked,
  };
}

export function last10Digits(value?: string | null) {
  return (value || "").replace(/\D/g, "").slice(-10);
}

export function phonesShareLast10(a?: string | null, b?: string | null) {
  const a10 = last10Digits(a);
  const b10 = last10Digits(b);
  return !!a10 && !!b10 && a10 === b10;
}
