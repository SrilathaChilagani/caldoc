// src/lib/auth.server.ts
import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_JWT_NAME, PROVIDER_JWT_NAME, SessionPayload } from "./auth";

function requireSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET");
  return s;
}

type DecodedSession = JwtPayload & {
  uid?: string;
  pid?: string;
  userId?: string;
  providerId?: string;
  role?: string;
  email?: string;
};

function normalizeDecoded(decoded: string | JwtPayload | SessionPayload | null): SessionPayload | null {
  if (!decoded || typeof decoded !== "object") return null;
  const d = decoded as DecodedSession;
  const uid = d.uid ?? d.userId;
  const pid = d.pid ?? d.providerId;
  const role = d.role;
  const email = d.email;
  if (!uid || !pid || !role) return null;
  return { uid, pid, role, email, exp: d.exp, iat: d.iat };
}

async function readSessionFromCookie(cookieName: string): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, requireSecret());
    return normalizeDecoded(decoded);
  } catch {
    return null;
  }
}

export async function readProviderSession(): Promise<SessionPayload | null> {
  return readSessionFromCookie(PROVIDER_JWT_NAME);
}

export async function readAdminSession(): Promise<SessionPayload | null> {
  return readSessionFromCookie(ADMIN_JWT_NAME);
}

export async function requireProviderSession(): Promise<{
  userId: string; providerId: string; role: string;
} | null> {
  const sess = await readProviderSession();
  if (!sess) return null;
  const user = await prisma.providerUser.findUnique({ where: { id: sess.uid } });
  if (!user) return null;
  return { userId: sess.uid, providerId: sess.pid, role: sess.role };
}

export async function requireAdminSession(): Promise<{ userId: string; role: string } | null> {
  const sess = await readAdminSession();
  if (!sess || sess.role !== "admin") return null;
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: sess.uid },
    select: { id: true },
  });
  if (!adminUser) return null;
  return { userId: adminUser.id, role: "admin" };
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.set(PROVIDER_JWT_NAME, "", { path: "/", maxAge: 0 });
  jar.set(ADMIN_JWT_NAME, "", { path: "/", maxAge: 0 });
}
