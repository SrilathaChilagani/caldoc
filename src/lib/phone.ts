export type PatientPhoneMeta = {
  canonical: string;
  digits: string;
  last10: string;
  masked: string;
};

export function buildPatientPhoneMeta(raw: string): PatientPhoneMeta | null {
  const digits = (raw || "").replace(/\D/g, "");

  // Strict Indian mobile validation.
  // Accepted formats → normalised last-10:
  //   XXXXXXXXXX      (10 digits, must start 6–9)
  //   0XXXXXXXXXX     (11 digits with leading 0)
  //   91XXXXXXXXXX    (12 digits with country code)
  // Indian mobile numbers always start with 6, 7, 8 or 9.
  let last10: string;
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    last10 = digits;
  } else if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    last10 = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    last10 = digits.slice(2);
  } else {
    // Reject anything else (too short, too long, or non-Indian prefix)
    return null;
  }

  const canonical = `+91${last10}`;
  return {
    canonical,
    digits,
    last10,
    masked: maskFromLast10(last10),
  };
}

function maskFromLast10(last10: string) {
  return `+91-••••${last10.slice(-4)}`;
}

export function last10Digits(value?: string | null) {
  return (value || "").replace(/\D/g, "").slice(-10);
}

export function phonesShareLast10(a?: string | null, b?: string | null) {
  const a10 = last10Digits(a);
  const b10 = last10Digits(b);
  return !!a10 && !!b10 && a10 === b10;
}
