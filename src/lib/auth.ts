// src/lib/auth.ts
import jwt from "jsonwebtoken";

export const PROVIDER_JWT_NAME = "prov_session";
export const ADMIN_JWT_NAME = "admin_sess";
export const MAX_AGE_DAYS = 7;

function isIpOrLocalhost(host?: string) {
  if (!host) return true;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^[\d.:]+$/.test(host)
  );
}

function inferCookieDomain(): string | undefined {
  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;

  const urlCandidate =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "";
  if (!urlCandidate) return undefined;

  try {
    const hostname = new URL(urlCandidate).hostname;
    if (!hostname || isIpOrLocalhost(hostname)) return undefined;
    return hostname.startsWith(".") ? hostname : hostname;
  } catch {
    return undefined;
  }
}

export const SESSION_COOKIE_DOMAIN = inferCookieDomain();

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
