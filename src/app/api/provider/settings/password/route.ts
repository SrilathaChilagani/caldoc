import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sess = await requireProviderSession();
    if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const current = String(body?.current || "").trim();
    const next = String(body?.next || "").trim();

    if (!current || !next) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }
    if (next.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.providerUser.findUnique({
      where: { id: sess.userId },
      select: { passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await bcrypt.compare(current, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const hash = await bcrypt.hash(next, 12);
    await prisma.providerUser.update({
      where: { id: sess.userId },
      data: { passwordHash: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
