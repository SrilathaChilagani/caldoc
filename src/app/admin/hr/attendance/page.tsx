import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import AttendanceOverviewClient from "./AttendanceOverviewClient";

export const dynamic = "force-dynamic";

export default async function AttendanceDashboardPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/admin/hr/attendance");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);

  const [employees, todayAttendances, pendingLeaves, departments] = await Promise.all([
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, employeeCode: true, department: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.attendance.findMany({
      where: { date: todayDate },
      select: { employeeId: true, clockIn: true, clockOut: true, status: true, workMinutes: true },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const todayMap = Object.fromEntries(todayAttendances.map((a) => [a.employeeId, a]));
  const presentToday = todayAttendances.filter((a) => a.clockIn).length;
  const clockedOut = todayAttendances.filter((a) => a.clockOut).length;

  const serializedEmployees = employees.map((e) => ({
    ...e,
    today: todayMap[e.id]
      ? {
          ...todayMap[e.id],
          clockIn: todayMap[e.id].clockIn?.toISOString() ?? null,
          clockOut: todayMap[e.id].clockOut?.toISOString() ?? null,
        }
      : null,
  }));

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">HR Portal</p>
          <h1 className="font-serif text-3xl text-slate-900">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Today's clock-in status and monthly attendance overview.
          </p>
        </div>
        <Link
          href="/admin/hr/attendance/leave"
          className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Leave requests
          {pendingLeaves > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {pendingLeaves}
            </span>
          )}
        </Link>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Active staff", value: employees.length, color: "text-slate-700" },
          { label: "Present today", value: presentToday, color: "text-emerald-600" },
          { label: "Clocked out", value: clockedOut, color: "text-blue-600" },
          { label: "Pending leaves", value: pendingLeaves, color: pendingLeaves > 0 ? "text-rose-600" : "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <AttendanceOverviewClient
        employees={serializedEmployees}
        departments={departments}
        currentMonth={currentMonth}
      />
    </>
  );
}
