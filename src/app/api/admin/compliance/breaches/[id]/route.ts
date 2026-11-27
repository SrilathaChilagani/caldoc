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
  const breach = await prisma.breachNotification.findUnique({ where: { id } });
  if (!breach) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ breach });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, notes, affectedCount, action } = body as {
    status?: string;
    notes?: string;
    affectedCount?: number;
    action?: "CONTAIN" | "RESOLVE" | "REPORT";
  };

  const VALID_STATUSES = [
    "DETECTED",
    "INVESTIGATING",
    "CONTAINED",
    "RESOLVED",
    "REPORTED_TO_AUTHORITY",
  ];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.breachNotification.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const breach = await prisma.breachNotification.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(affectedCount !== undefined ? { affectedCount } : {}),
      ...(action === "CONTAIN" ? { containedAt: now } : {}),
      ...(action === "RESOLVE" ? { resolvedAt: now, status: "RESOLVED" } : {}),
      ...(action === "REPORT"
        ? { reportedAt: now, status: "REPORTED_TO_AUTHORITY" }
        : {}),
    },
  });

  return NextResponse.json({ breach });
}
