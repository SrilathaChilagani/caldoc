import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: employeeId, docId } = await params;

  const doc = await prisma.employeeDocument.findFirst({ where: { id: docId, employeeId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.employeeDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
