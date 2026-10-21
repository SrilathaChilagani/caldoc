// src/lib/auth.server.ts
import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_JWT_NAME, PROVIDER_JWT_NAME, NGO_JWT_NAME, LABS_JWT_NAME, PHARMACY_JWT_NAME, FRONTDESK_JWT_NAME, SESSION_COOKIE_DOMAIN, SessionPayload } from "./auth";

function requireSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
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

function hasRole(actual: string | undefined, expected: string) {
  return (actual || "").toLowerCase() === expected.toLowerCase();
}

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

export async function readNgoSession(): Promise<SessionPayload | null> {
  return readSessionFromCookie(NGO_JWT_NAME);
}

export async function readLabsSession(): Promise<SessionPayload | null> {
  return readSessionFromCookie(LABS_JWT_NAME);
}

export async function readPharmacySession(): Promise<SessionPayload | null> {
  return readSessionFromCookie(PHARMACY_JWT_NAME);
}

export async function requireProviderSession(): Promise<{
  userId: string; providerId: string; role: string;
} | null> {
  const sess = await readProviderSession();
  if (!sess || !hasRole(sess.role, "provider")) return null;
  const user = await prisma.providerUser.findUnique({ where: { id: sess.uid } });
  if (!user) return null;
  return { userId: sess.uid, providerId: sess.pid, role: sess.role };
}

export async function requireAdminSession(): Promise<{ userId: string; role: string } | null> {
  const sess = await readAdminSession();
  if (!sess || sess.role !== "admin") return null;
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: sess.uid },
    select: { id: true, role: true },
  });
  if (!adminUser) return null;
  return { userId: adminUser.id, role: adminUser.role };
}

export async function requireSuperAdminSession(): Promise<{ userId: string; role: string } | null> {
  const sess = await requireAdminSession();
  if (!sess || sess.role !== "SUPER_ADMIN") return null;
  return sess;
}

export async function requireOperationsSession(): Promise<{ userId: string; role: string } | null> {
  const sess = await requireAdminSession();
  if (!sess || !["SUPER_ADMIN", "OPERATIONS"].includes(sess.role)) return null;
  return sess;
}

export async function requireNgoSession(): Promise<{ userId: string; ngoId: string; role: string; email?: string } | null> {
  const sess = await readNgoSession();
  if (!sess) return null;
  const user = await prisma.ngoUser.findUnique({
    where: { id: sess.uid },
    select: { id: true, ngoId: true, email: true },
  });
  if (!user) return null;
  return { userId: user.id, ngoId: user.ngoId, role: sess.role, email: sess.email ?? user.email };
}

export async function requireLabsSession(): Promise<{ userId: string; email?: string; labPartnerId: string | null } | null> {
  const sess = await readLabsSession();
  if (sess) {
    const user = await prisma.labUser.findUnique({ where: { id: sess.uid }, select: { id: true, email: true, labPartnerId: true } });
    // Reject: user deleted, partner unassigned, or JWT partner ID doesn't match DB (detects DB tampering / reassignment)
    if (!user || !user.labPartnerId || sess.pid !== user.labPartnerId) return null;
    return { userId: user.id, email: user.email, labPartnerId: user.labPartnerId };
  }
  // Fall back: allow any logged-in admin to access the labs portal (no partner restriction)
  const adminSess = await requireAdminSession();
  if (adminSess) return { userId: adminSess.userId, email: "admin", labPartnerId: null };
  return null;
}

export async function requirePharmacySession(): Promise<{ userId: string; email?: string; pharmacyPartnerId: string | null } | null> {
  const sess = await readPharmacySession();
  if (sess) {
    const user = await prisma.pharmacyUser.findUnique({ where: { id: sess.uid }, select: { id: true, email: true, pharmacyPartnerId: true } });
    // Reject: user deleted, partner unassigned, or JWT partner ID doesn't match DB (detects DB tampering / reassignment)
    if (!user || !user.pharmacyPartnerId || sess.pid !== user.pharmacyPartnerId) return null;
    return { userId: user.id, email: user.email, pharmacyPartnerId: user.pharmacyPartnerId };
  }
  // Fall back: allow any logged-in admin to access the pharmacy portal (no partner restriction)
  const adminSess = await requireAdminSession();
  if (adminSess) return { userId: adminSess.userId, email: "admin", pharmacyPartnerId: null };
  return null;
}

export async function readFrontDeskSession(): Promise<SessionPayload | null> {
  return readSessionFromCookie(FRONTDESK_JWT_NAME);
}

export async function requireFrontDeskSession(): Promise<{
  userId: string;
  role: string;
  email?: string;
  providerIds: string[] | null; // null = admin fallback (full access)
} | null> {
  const sess = await readFrontDeskSession();
  if (sess && sess.role === "frontdesk") {
    const user = await prisma.frontDeskUser.findUnique({
      where: { id: sess.uid },
      select: {
        id: true,
        email: true,
        clinics: {
          select: { providerClinic: { select: { providerId: true } } },
        },
      },
    });
    if (user) {
      const providerIds = user.clinics.map((c) => c.providerClinic.providerId);
      return { userId: user.id, role: "frontdesk", email: user.email, providerIds };
    }
  }
  // Fall back: admin sessions have full unrestricted access
  const adminSess = await requireAdminSession();
  if (adminSess) return { userId: adminSess.userId, role: "admin", email: "admin", providerIds: null };
  return null;
}

export async function clearSessionCookies() {
  const jar = await cookies();
  const domainOption = SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {};
  jar.set(PROVIDER_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  jar.set(ADMIN_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  jar.set(NGO_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  jar.set(LABS_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  jar.set(PHARMACY_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  jar.set(FRONTDESK_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
}
