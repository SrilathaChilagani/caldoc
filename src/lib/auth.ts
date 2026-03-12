// src/lib/auth.ts
import jwt from "jsonwebtoken";

export const PROVIDER_JWT_NAME = "prov_session";
export const ADMIN_JWT_NAME = "admin_sess";
export const NGO_JWT_NAME = "ngo_sess";
export const LABS_JWT_NAME = "labs_sess";
export const PHARMACY_JWT_NAME = "pharmacy_sess";
export const FRONTDESK_JWT_NAME = "fd_sess";
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

function normalizeCookieDomain(candidate?: string | null): string | undefined {
  if (!candidate) return undefined;
  let domain = candidate.trim().toLowerCase();
  if (!domain) return undefined;
  domain = domain.replace(/^https?:\/\//, "").split("/")[0];
  domain = domain.replace(/^\.+/, "");
  if (domain.startsWith("www.")) domain = domain.slice(4);
  if (!domain || isIpOrLocalhost(domain)) return undefined;
  return `.${domain}`;
}

function inferDomainFromEnv(): string | undefined {
  const urlCandidate =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";
  if (!urlCandidate) return undefined;

  try {
    const hostname = new URL(urlCandidate.startsWith("http") ? urlCandidate : `https://${urlCandidate}`).hostname;
    return normalizeCookieDomain(hostname);
  } catch {
    return undefined;
  }
}

const explicitDomain = normalizeCookieDomain(process.env.SESSION_COOKIE_DOMAIN || null);
const inferredDomain = explicitDomain ?? inferDomainFromEnv();

export const SESSION_COOKIE_DOMAIN = inferredDomain;

export function resolveSessionCookieDomain(hostname?: string): string | undefined {
  if (explicitDomain) return explicitDomain;
  const runtime = normalizeCookieDomain(hostname || null);
  if (runtime) return runtime;
  if (hostname && isIpOrLocalhost(hostname)) return undefined;
  return inferredDomain;
}

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
