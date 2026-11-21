import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const period = searchParams.get("period") || undefined;
  const status = searchParams.get("status") || undefined;

  const reviews = await prisma.performanceReview.findMany({
    where: {
      ...(employeeId ? { employeeId } : {}),
      ...(period ? { period } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true, jobTitle: true } },
    },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    reviews.map((r) => ({
      ...r,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, reviewerId, period } = await req.json();
  if (!employeeId || !reviewerId || !period) {
    return NextResponse.json({ error: "employeeId, reviewerId and period are required" }, { status: 400 });
  }

  const review = await prisma.performanceReview.create({
    data: { employeeId, reviewerId, period },
    include: {
      employee: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  return NextResponse.json(
    { ...review, submittedAt: null, acknowledgedAt: null, createdAt: review.createdAt.toISOString(), updatedAt: review.updatedAt.toISOString() },
    { status: 201 }
  );
}
