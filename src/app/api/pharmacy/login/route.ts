import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { PHARMACY_JWT_NAME, resolveSessionCookieDomain, signSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const LOGIN_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

async function readCredentials(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    return {
      email: String(body.email || "").trim().toLowerCase(),
      password: String(body.password || ""),
      nextUrl: String(body.next || "/pharmacy"),
    };
  }
  const form = await req.formData();
  return {
    email: String(form.get("email") || "").trim().toLowerCase(),
    password: String(form.get("password") || ""),
    nextUrl: String(form.get("next") || "/pharmacy"),
  };
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req.headers), LOGIN_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { email, password, nextUrl } = await readCredentials(req);
  const redirectWithError = (code: string) =>
    NextResponse.redirect(
      new URL(
        `/pharmacy/login?err=${code}&next=${encodeURIComponent(nextUrl)}&uid=${encodeURIComponent(email)}`,
        req.nextUrl.origin,
      ),
    );

  if (!email || !password) return redirectWithError("creds");

  const user = await prisma.pharmacyUser.findUnique({ where: { email } });
  if (!user) return redirectWithError("creds");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return redirectWithError("creds");

  const token = signSession({
    userId: user.id,
    providerId: user.pharmacyPartnerId ?? "pharmacy",
    role: "pharmacy",
    email: user.email,
  });
  const res = NextResponse.redirect(new URL(nextUrl || "/pharmacy", req.nextUrl.origin), 303);
  const domain = resolveSessionCookieDomain(req.nextUrl.hostname);
  res.cookies.set(PHARMACY_JWT_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  });
  logAudit({ action: "PHARMACY_LOGIN", actorType: "PHARMACY", actorId: user.id, meta: { email } }).catch(() => {});
  return res;
}
