import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireNgoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await prisma.ngoUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.ngoUser.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
