export type PatientPhoneMeta = {
  canonical: string;
  digits: string;
  last10: string;
  masked: string;
};

export function buildPatientPhoneMeta(raw: string): PatientPhoneMeta | null {
  const digits = (raw || "").replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (!last10) return null;

  const canonical = canonicalIndiaPhone(digits, last10);
  return {
    canonical,
    digits,
    last10,
    masked: maskFromLast10(last10),
  };
}

function canonicalIndiaPhone(digits: string, last10: string) {
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+91${digits.slice(1)}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 6 && digits.length <= 15) return `+${digits}`;
  return `+91${last10}`;
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
