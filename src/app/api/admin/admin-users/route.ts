import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS", "SUPPORT", "FINANCE"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

export async function GET() {
  const sess = await requireSuperAdminSession();
  if (!sess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const sess = await requireSuperAdminSession();
  if (!sess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role: AdminRole = ADMIN_ROLES.includes(body.role) ? body.role : "SUPPORT";
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.adminUser.create({
    data: { email, passwordHash, role },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
