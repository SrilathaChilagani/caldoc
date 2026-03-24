import jwt from "jsonwebtoken";

const MOBILE_SECRET =
  process.env.PATIENT_MOBILE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "change-me";

const TOKEN_TTL_DAYS = Number(process.env.PATIENT_MOBILE_JWT_MAX_AGE_DAYS || 365);

type PatientMobileClaims = {
  sub: string;
  phone: string;
  name?: string | null;
};

export function signPatientMobileToken(args: { patientId: string; phone: string; name?: string | null }) {
  const payload: PatientMobileClaims = {
    sub: args.patientId,
    phone: args.phone,
    ...(args.name ? { name: args.name } : {}),
  };
  return jwt.sign(payload, MOBILE_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
}

export function verifyPatientMobileToken(token: string) {
  const decoded = jwt.verify(token, MOBILE_SECRET) as PatientMobileClaims;
  return {
    patientId: decoded.sub,
    phone: decoded.phone,
    name: decoded.name ?? null,
  };
}
