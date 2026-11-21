import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ employeeId: string }> };

// GET — monthly attendance for one employee
export async function GET(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = await params;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let from: Date;
  let to: Date;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0, 23, 59, 59);
  } else {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const [employee, attendances, leaves] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        fromDate: { lte: to },
        toDate: { gte: from },
      },
      select: { fromDate: true, toDate: true, leaveType: true },
    }),
  ]);

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const summary = {
    present: attendances.filter((a) => a.status === "PRESENT").length,
    absent: attendances.filter((a) => a.status === "ABSENT").length,
    halfDay: attendances.filter((a) => a.status === "HALF_DAY").length,
    onLeave: attendances.filter((a) => a.status === "ON_LEAVE").length,
    totalWorkMinutes: attendances.reduce((s, a) => s + (a.workMinutes ?? 0), 0),
  };

  return NextResponse.json({
    employee,
    attendances: attendances.map((a) => ({
      ...a,
      date: a.date.toISOString().slice(0, 10),
      clockIn: a.clockIn?.toISOString() ?? null,
      clockOut: a.clockOut?.toISOString() ?? null,
    })),
    leaves: leaves.map((l) => ({
      ...l,
      fromDate: l.fromDate.toISOString().slice(0, 10),
      toDate: l.toDate.toISOString().slice(0, 10),
    })),
    summary,
  });
}
