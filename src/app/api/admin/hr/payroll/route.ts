import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// Working days per month (Mon–Sat = 26 days is standard Indian payroll)
const STANDARD_WORKING_DAYS = 26;

export async function GET() {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await prisma.payrollRun.findMany({
    orderBy: { month: "desc" },
    include: {
      _count: { select: { payslips: true } },
      payslips: { select: { status: true, netPaise: true } },
    },
  });

  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      month: r.month,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
      totalEmployees: r._count.payslips,
      totalNetPaise: r.payslips.reduce((s, p) => s + p.netPaise, 0),
      paidCount: r.payslips.filter((p) => p.status === "PAID").length,
    }))
  );
}

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { month, note } = await req.json(); // month = "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  const existing = await prisma.payrollRun.findUnique({ where: { month } });
  if (existing) return NextResponse.json({ error: `Payroll for ${month} already exists` }, { status: 409 });

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59);

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      basicSalaryPaise: true,
      attendances: {
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { status: true },
      },
    },
  });

  const run = await prisma.payrollRun.create({
    data: {
      month,
      status: "DRAFT",
      note: note ?? null,
      createdBy: sess.userId,
    },
  });

  // Calculate payslips for each employee
  const payslips = employees.map((emp) => {
    const att = emp.attendances;
    const presentDays = att.filter((a) => a.status === "PRESENT").length;
    const halfDays = att.filter((a) => a.status === "HALF_DAY").length;
    const absentDays = att.filter((a) => a.status === "ABSENT").length;
    const leaveDays = att.filter((a) => a.status === "ON_LEAVE").length;

    const basic = emp.basicSalaryPaise;
    const hra = Math.round(basic * 0.4);         // 40% of basic
    const da = Math.round(basic * 0.1);          // 10% DA
    const gross = basic + hra + da;

    // Deduct for absent days (half-day counts as 0.5)
    const effectiveAbsent = absentDays + halfDays * 0.5;
    const perDayPaise = Math.round(basic / STANDARD_WORKING_DAYS);
    const absentDeduct = Math.round(perDayPaise * effectiveAbsent);

    // Simplified TDS: 10% of gross if gross > ₹25,000/mo
    const grossRs = gross / 100;
    const tdsDeduct = grossRs > 25000 ? Math.round(gross * 0.1) : 0;

    const net = Math.max(0, gross - absentDeduct - tdsDeduct);

    return {
      payrollRunId: run.id,
      employeeId: emp.id,
      basicPaise: basic,
      hraPaise: hra,
      daPaise: da,
      grossPaise: gross,
      absentDeductPaise: absentDeduct,
      tdsDeductPaise: tdsDeduct,
      netPaise: net,
      presentDays,
      halfDays,
      absentDays,
      leaveDays,
      totalWorkingDays: STANDARD_WORKING_DAYS,
    };
  });

  await prisma.payslip.createMany({ data: payslips });

  return NextResponse.json({ id: run.id, month: run.month, employeeCount: payslips.length }, { status: 201 });
}
