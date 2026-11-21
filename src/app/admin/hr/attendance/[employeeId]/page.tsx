import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import EmployeeAttendanceClient from "./EmployeeAttendanceClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ employeeId: string }>; searchParams: Promise<{ month?: string }> };

export default async function EmployeeAttendancePage({ params, searchParams }: Props) {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const { employeeId } = await params;
  const { month: monthParam } = await searchParams;

  const now = new Date();
  const month = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59);

  const [employee, attendances, leaves] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, employeeCode: true, department: { select: { name: true } }, status: true },
    }),
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId, status: "APPROVED", fromDate: { lte: monthEnd }, toDate: { gte: monthStart } },
      select: { fromDate: true, toDate: true, leaveType: true, totalDays: true },
    }),
  ]);

  if (!employee) notFound();

  const summary = {
    present: attendances.filter((a) => a.status === "PRESENT").length,
    halfDay: attendances.filter((a) => a.status === "HALF_DAY").length,
    absent: attendances.filter((a) => a.status === "ABSENT").length,
    onLeave: attendances.filter((a) => a.status === "ON_LEAVE").length,
    totalWorkMinutes: attendances.reduce((s, a) => s + (a.workMinutes ?? 0), 0),
  };

  // Build a date → record map for the month calendar
  const recordMap: Record<string, (typeof attendances)[0]> = {};
  for (const a of attendances) {
    recordMap[a.date.toISOString().slice(0, 10)] = a;
  }

  const daysInMonth = new Date(y, m, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(y, m - 1, i + 1);
    const key = d.toISOString().slice(0, 10);
    const r = recordMap[key];
    return {
      date: key,
      dayOfWeek: d.getDay(),
      record: r
        ? {
            status: r.status,
            clockIn: r.clockIn?.toISOString() ?? null,
            clockOut: r.clockOut?.toISOString() ?? null,
            workMinutes: r.workMinutes,
          }
        : null,
    };
  });

  return (
    <>
      <div>
        <Link href="/admin/hr/attendance" className="text-xs font-medium text-[#2f6ea5] hover:underline">
          ← Attendance
        </Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">{employee.name}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {employee.employeeCode} · {employee.department.name}
        </p>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Present", value: summary.present, color: "text-emerald-600" },
          { label: "Half day", value: summary.halfDay, color: "text-amber-600" },
          { label: "Absent", value: summary.absent, color: "text-rose-600" },
          { label: "On leave", value: summary.onLeave, color: "text-blue-600" },
          { label: "Hours worked", value: `${Math.floor(summary.totalWorkMinutes / 60)}h`, color: "text-slate-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <EmployeeAttendanceClient
        employeeId={employee.id}
        calendarDays={calendarDays}
        month={month}
        leaves={leaves.map((l) => ({
          ...l,
          fromDate: l.fromDate.toISOString().slice(0, 10),
          toDate: l.toDate.toISOString().slice(0, 10),
        }))}
      />
    </>
  );
}
