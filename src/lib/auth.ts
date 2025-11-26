// src/lib/auth.ts
import jwt from "jsonwebtoken";

export const PROVIDER_JWT_NAME = "prov_session";
export const ADMIN_JWT_NAME = "admin_sess";
export const MAX_AGE_DAYS = 7;

export type SessionPayload = {
  uid: string;
  pid: string;
  role: string;
  email?: string;
  exp?: number;
  iat?: number;
};

// ONLY signing here (no next/headers)
export function signSession(args: { userId: string; providerId: string; role: string; email?: string }) {
  const secret = process.env.JWT_SECRET!;
  const payload = {
    uid: args.userId,
    pid: args.providerId,
    role: args.role,
    ...(args.email ? { email: args.email } : {}),
  };
  return jwt.sign(payload, secret, { expiresIn: `${MAX_AGE_DAYS}d` });
}
