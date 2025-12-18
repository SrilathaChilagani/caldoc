import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { NGO_JWT_NAME, resolveSessionCookieDomain, signSession } from "@/lib/auth";

const allowedEmails = (process.env.NGO_ALLOWED_EMAILS || "")
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
      nextUrl: String(body.next || "/ngo/appointments"),
    };
  }
  const form = await req.formData();
  return {
    email: String(form.get("email") || "").trim().toLowerCase(),
    password: String(form.get("password") || ""),
    nextUrl: String(form.get("next") || "/ngo/appointments"),
  };
}

async function bootstrapNgoAccount(email: string, password: string) {
  const fallback = process.env.NGO_PORTAL_DEFAULT_PASSWORD || "Passw0rd!";
  if (!email.endsWith("@ngo.local") || password !== fallback) return null;
  const slug = email.split("@")[0];
  if (!slug) return null;
  const ngo = await prisma.ngo.findFirst({ where: { slug } });
  if (!ngo) return null;
  const hash = await bcrypt.hash(fallback, 10);
  return prisma.ngoUser.create({
    data: {
      email,
      passwordHash: hash,
      ngoId: ngo.id,
      role: "ADMIN",
    },
    select: { id: true, ngoId: true, passwordHash: true, role: true, email: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, nextUrl } = await readCredentials(req);
    if (!email || !password) {
      return NextResponse.redirect(
        new URL(`/ngo/login?err=creds&next=${encodeURIComponent(nextUrl)}&uid=${encodeURIComponent(email)}`, req.nextUrl.origin),
      );
    }

    if (allowedEmails.length && !allowedEmails.includes(email)) {
      return NextResponse.redirect(
        new URL(`/ngo/login?err=creds&next=${encodeURIComponent(nextUrl)}&uid=${encodeURIComponent(email)}`, req.nextUrl.origin),
      );
    }

    let ngoUser = await prisma.ngoUser.findUnique({
      where: { email },
      select: { id: true, ngoId: true, passwordHash: true, role: true, email: true },
    });

    if (!ngoUser) {
      ngoUser = await bootstrapNgoAccount(email, password);
    }

    if (!ngoUser || !ngoUser.passwordHash) {
      return NextResponse.redirect(
        new URL(`/ngo/login?err=creds&next=${encodeURIComponent(nextUrl)}&uid=${encodeURIComponent(email)}`, req.nextUrl.origin),
      );
    }

    const valid = await bcrypt.compare(password, ngoUser.passwordHash);
    if (!valid) {
      return NextResponse.redirect(
        new URL(`/ngo/login?err=creds&next=${encodeURIComponent(nextUrl)}&uid=${encodeURIComponent(email)}`, req.nextUrl.origin),
      );
    }

    const token = signSession({
      userId: ngoUser.id,
      providerId: ngoUser.ngoId,
      role: "ngo",
      email: ngoUser.email,
    });

    const target = new URL(nextUrl || "/ngo/appointments", req.nextUrl.origin);
    if (!target.pathname.startsWith("/ngo")) {
      target.pathname = "/ngo/appointments";
      target.search = "";
    }

    const res = NextResponse.redirect(target, 303);
    const cookieDomain = resolveSessionCookieDomain(req.nextUrl.hostname);
    const domainOption = cookieDomain ? { domain: cookieDomain } : {};
    res.cookies.set(NGO_JWT_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...domainOption,
    });

    return res;
  } catch (err) {
    console.error("ngo login error", err);
    return NextResponse.redirect(new URL(`/ngo/login?err=server`, req.nextUrl.origin));
  }
}
