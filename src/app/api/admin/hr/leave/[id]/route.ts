import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH — approve / reject / cancel a leave request
export async function PATCH(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, reviewNote } = await req.json();

  if (!["APPROVED", "REJECTED", "CANCELLED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: action,
      reviewedBy: sess.userId,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  });

  // When approved, upsert Attendance records for the leave period as ON_LEAVE
  if (action === "APPROVED") {
    const records: { employeeId: string; date: Date; status: string }[] = [];
    const cur = new Date(leave.fromDate);
    while (cur <= leave.toDate) {
      records.push({ employeeId: leave.employeeId, date: new Date(cur), status: "ON_LEAVE" });
      cur.setDate(cur.getDate() + 1);
    }
    for (const r of records) {
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: r.employeeId, date: r.date } },
        create: { employeeId: r.employeeId, date: r.date, status: "ON_LEAVE" },
        update: { status: "ON_LEAVE" },
      });
    }
  }

  return NextResponse.json({
    ...leave,
    fromDate: leave.fromDate.toISOString().slice(0, 10),
    toDate: leave.toDate.toISOString().slice(0, 10),
    reviewedAt: leave.reviewedAt?.toISOString() ?? null,
    createdAt: leave.createdAt.toISOString(),
    updatedAt: leave.updatedAt.toISOString(),
  });
}
