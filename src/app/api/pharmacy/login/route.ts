import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { PHARMACY_JWT_NAME, resolveSessionCookieDomain, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
  return res;
}
