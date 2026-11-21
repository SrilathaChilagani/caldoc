/**
 * Step 2 of admin login when TOTP is enabled.
 * Expects: { pendingToken: string, code: string }
 * On success: issues the real admin session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import speakeasy from "speakeasy";
import { prisma } from "@/lib/db";
import { ADMIN_JWT_NAME, MAX_AGE_DAYS, resolveSessionCookieDomain, signSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const TOTP_PENDING_COOKIE = "admin_totp_pending";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function POST(req: NextRequest) {
  const { code, nextUrl } = await req.json() as { code?: string; nextUrl?: string };

  // Read pending token from cookie
  const pendingToken = req.cookies.get(TOTP_PENDING_COOKIE)?.value;
  if (!pendingToken) {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 });
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(pendingToken, secret());
    if (payload.sub !== "totp_pending" || typeof payload.userId !== "string") throw new Error("Invalid");
    userId = payload.userId;
  } catch {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 });
  }

  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA not configured for this account" }, { status: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: code.replace(/\s/g, ""),
    window: 1,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Issue real session cookie
  const token = signSession({ userId: user.id, providerId: "admin", role: "admin", email: user.email });
  const domain = resolveSessionCookieDomain(req.nextUrl.hostname);

  const res = NextResponse.json({ ok: true, redirect: nextUrl || "/admin" });
  // Clear the pending cookie
  res.cookies.set(TOTP_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
  // Set the real session
  res.cookies.set(ADMIN_JWT_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
    ...(domain ? { domain } : {}),
  });

  logAudit({ action: "ADMIN_LOGIN", actorType: "ADMIN", actorId: user.id, meta: { email: user.email, method: "TOTP" } }).catch(() => {});
  return res;
}

/** Helper used by admin login route to issue the pending TOTP cookie */
export async function issueTotpPendingCookie(userId: string, expirySeconds = 600): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("totp_pending")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expirySeconds)
    .sign(secret());
  return token;
}

export { TOTP_PENDING_COOKIE };
