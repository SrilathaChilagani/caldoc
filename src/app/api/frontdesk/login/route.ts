import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { FRONTDESK_JWT_NAME, resolveSessionCookieDomain, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const allowedEmails = (process.env.FRONTDESK_ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  const nextUrl = req.nextUrl.searchParams.get("next") || "/frontdesk";

  let email = "", password = "";
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    email = String(body.email || "").trim().toLowerCase();
    password = String(body.password || "");
  } else {
    const form = await req.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    password = String(form.get("password") || "");
  }

  const errRedirect = (code: string) =>
    NextResponse.redirect(
      new URL(`/frontdesk/login?err=${code}&uid=${encodeURIComponent(email)}`, req.nextUrl.origin),
    );

  if (!email || !password) return errRedirect("creds");

  const defaultPassword = process.env.FRONTDESK_DEFAULT_PASSWORD || "FrontDesk1!";
  let user = await prisma.frontDeskUser.findUnique({ where: { email } });

  if (!user && allowedEmails.includes(email)) {
    const hash = await bcrypt.hash(defaultPassword, 10);
    user = await prisma.frontDeskUser.create({ data: { email, passwordHash: hash } });
  }

  if (!user) return errRedirect("creds");

  // Re-hash if still on default password
  if (password === defaultPassword) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const newHash = await bcrypt.hash(defaultPassword, 10);
      user = await prisma.frontDeskUser.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    }
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return errRedirect("creds");

  const token = signSession({ userId: user.id, providerId: "frontdesk", role: "frontdesk", email: user.email });
  const res = NextResponse.redirect(new URL(nextUrl, req.nextUrl.origin), 303);
  const domain = resolveSessionCookieDomain(req.nextUrl.hostname);
  res.cookies.set(FRONTDESK_JWT_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    ...(domain ? { domain } : {}),
  });
  return res;
}
