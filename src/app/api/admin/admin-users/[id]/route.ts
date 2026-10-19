import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/auth.server";
import { ADMIN_ROLES } from "../route";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireSuperAdminSession();
  if (!sess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === sess.userId) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  if (!ADMIN_ROLES.includes(body.role)) {
    return NextResponse.json({ error: `role must be one of: ${ADMIN_ROLES.join(", ")}` }, { status: 400 });
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: { role: body.role },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireSuperAdminSession();
  if (!sess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === sess.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
