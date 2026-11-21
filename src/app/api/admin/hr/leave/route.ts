import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET — list leave requests (optionally filter by status / employeeId)
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    leaves.map((l) => ({
      ...l,
      fromDate: l.fromDate.toISOString().slice(0, 10),
      toDate: l.toDate.toISOString().slice(0, 10),
      reviewedAt: l.reviewedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }))
  );
}

// POST — employee submits a leave request
export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, leaveType, fromDate, toDate, reason } = await req.json();
  if (!employeeId || !leaveType || !fromDate || !toDate || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (to < from) return NextResponse.json({ error: "toDate must be >= fromDate" }, { status: 400 });

  // Simple business-day count (counts all days including weekends — HR can adjust)
  const msPerDay = 86400000;
  const totalDays = Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;

  const leave = await prisma.leaveRequest.create({
    data: { employeeId, leaveType, fromDate: from, toDate: to, totalDays, reason },
    include: { employee: { select: { name: true } } },
  });

  return NextResponse.json(
    {
      ...leave,
      fromDate: leave.fromDate.toISOString().slice(0, 10),
      toDate: leave.toDate.toISOString().slice(0, 10),
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
