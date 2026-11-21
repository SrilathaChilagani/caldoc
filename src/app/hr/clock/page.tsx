import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import ClockInClient from "./ClockInClient";

export const dynamic = "force-dynamic";

export default async function ClockInPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/hr/clock");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load all active employees + their today record for a kiosk-style view
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      department: { select: { name: true } },
      attendances: {
        where: { date: today },
        select: { clockIn: true, clockOut: true, status: true, workMinutes: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const serialized = employees.map((e) => ({
    id: e.id,
    name: e.name,
    employeeCode: e.employeeCode,
    department: e.department.name,
    today: e.attendances[0]
      ? {
          clockIn: e.attendances[0].clockIn?.toISOString() ?? null,
          clockOut: e.attendances[0].clockOut?.toISOString() ?? null,
          status: e.attendances[0].status,
          workMinutes: e.attendances[0].workMinutes,
        }
      : null,
  }));

  return (
    <main className="min-h-screen bg-gray-100 pt-6 pb-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">CalDoc HR</p>
          <h1 className="font-serif text-3xl text-slate-900">Attendance terminal</h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <ClockInClient employees={serialized} />
      </div>
    </main>
  );
}
