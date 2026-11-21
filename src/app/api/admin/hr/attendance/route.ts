import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET /api/admin/hr/attendance?month=2026-11  — daily attendance for all employees in a month
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  const departmentId = searchParams.get("departmentId") || undefined;

  let from: Date;
  let to: Date;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0, 23, 59, 59); // last day of month
  } else {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const [attendances, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        id: true,
        employeeId: true,
        date: true,
        clockIn: true,
        clockOut: true,
        status: true,
        workMinutes: true,
        notes: true,
      },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    }),
    prisma.employee.findMany({
      where: {
        status: "ACTIVE",
        ...(departmentId ? { departmentId } : {}),
      },
      select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    employees,
    attendances: attendances.map((a) => ({
      ...a,
      date: a.date.toISOString().slice(0, 10),
      clockIn: a.clockIn?.toISOString() ?? null,
      clockOut: a.clockOut?.toISOString() ?? null,
    })),
    month: month ?? `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
  });
}

// POST /api/admin/hr/attendance — admin manually mark attendance
export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, date, status, notes } = await req.json();
  if (!employeeId || !date || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    create: { employeeId, date: new Date(date), status, notes: notes ?? null },
    update: { status, notes: notes ?? null },
  });

  return NextResponse.json({ ...record, date: record.date.toISOString().slice(0, 10) });
}
