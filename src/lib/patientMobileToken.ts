import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return secret;
}

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
  return jwt.sign(payload, getSecret(), { expiresIn: `${TOKEN_TTL_DAYS}d` });
}

export function verifyPatientMobileToken(token: string) {
  const decoded = jwt.verify(token, getSecret()) as PatientMobileClaims;
  return {
    patientId: decoded.sub,
    phone: decoded.phone,
    name: decoded.name ?? null,
  };
}
