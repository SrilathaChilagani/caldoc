import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { LABS_JWT_NAME, resolveSessionCookieDomain, signSession } from "@/lib/auth";

const allowedEmails = (process.env.LABS_ALLOWED_EMAILS || "srilatha.chilagani@telemed.local")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const dynamic = "force-dynamic";

async function readCredentials(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    return {
      email: String(body.email || "").trim().toLowerCase(),
      password: String(body.password || ""),
      nextUrl: String(body.next || "/labs"),
    };
  }
  const form = await req.formData();
  return {
    email: String(form.get("email") || "").trim().toLowerCase(),
    password: String(form.get("password") || ""),
    nextUrl: String(form.get("next") || "/labs"),
  };
}

export async function POST(req: NextRequest) {
  const { email, password, nextUrl } = await readCredentials(req);
  const redirectWithError = (code: string) =>
    NextResponse.redirect(
      new URL(`/labs/login?err=${code}&next=${encodeURIComponent(nextUrl)}&uid=${encodeURIComponent(email)}`, req.nextUrl.origin),
    );

  if (!email || !password) {
    return redirectWithError("creds");
  }
  if (!allowedEmails.includes(email)) {
    return redirectWithError("creds");
  }

  const defaultPassword = process.env.LABS_PORTAL_DEFAULT_PASSWORD || "Passw0rd!";
  let user = await prisma.labUser.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcrypt.hash(defaultPassword, 10);
    user = await prisma.labUser.create({ data: { email, passwordHash: hash } });
  }

  if (password === defaultPassword) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const newHash = await bcrypt.hash(defaultPassword, 10);
      user = await prisma.labUser.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    }
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return redirectWithError("creds");
  }

  const token = signSession({ userId: user.id, providerId: "labs", role: "labs", email: user.email });
  const res = NextResponse.redirect(new URL(nextUrl || "/labs", req.nextUrl.origin), 303);
  const domain = resolveSessionCookieDomain(req.nextUrl.hostname);
  res.cookies.set(LABS_JWT_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  });
  return res;
}
