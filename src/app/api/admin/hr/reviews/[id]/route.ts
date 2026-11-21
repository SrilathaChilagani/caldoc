import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const review = await prisma.performanceReview.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true, jobTitle: true } },
    },
  });

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...review,
    submittedAt: review.submittedAt?.toISOString() ?? null,
    acknowledgedAt: review.acknowledgedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = ["overallRating", "strengths", "improvements", "goalsNextPeriod", "privateNotes", "reviewerId"];
  const data: Record<string, unknown> = {};
  for (const f of allowedFields) {
    if (f in body) data[f] = body[f] ?? null;
  }

  // Handle status transitions
  if (body.action === "SUBMIT") {
    data.status = "SUBMITTED";
    data.submittedAt = new Date();
  } else if (body.action === "ACKNOWLEDGE") {
    data.status = "ACKNOWLEDGED";
    data.acknowledgedAt = new Date();
  } else if (body.action === "REOPEN") {
    data.status = "DRAFT";
    data.submittedAt = null;
  }

  const review = await prisma.performanceReview.update({
    where: { id },
    data,
    include: {
      employee: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ...review,
    submittedAt: review.submittedAt?.toISOString() ?? null,
    acknowledgedAt: review.acknowledgedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  });
}
