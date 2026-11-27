import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dsr = await prisma.dataSubjectRequest.findUnique({
    where: { id },
    include: { patient: { select: { id: true, name: true, phone: true, email: true } } },
  });
  if (!dsr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ dsr });
}

// PATCH — update status and notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, notes } = body as { status?: string; notes?: string };

  const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.dataSubjectRequest.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isTerminal = status === "COMPLETED" || status === "REJECTED";

  const dsr = await prisma.dataSubjectRequest.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(isTerminal ? { resolvedAt: new Date(), handledBy: sess.userId } : {}),
    },
  });

  return NextResponse.json({ dsr });
}
