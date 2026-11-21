import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ON_LEAVE: "bg-amber-50 text-amber-700",
  TERMINATED: "bg-rose-50 text-rose-700",
  RESIGNED: "bg-slate-100 text-slate-600",
};

export default async function HrDashboardPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/admin/hr");

  const [totalActive, onLeave, terminated, resigned, departments, recentHires] =
    await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.employee.count({ where: { status: "ON_LEAVE" } }),
      prisma.employee.count({ where: { status: "TERMINATED" } }),
      prisma.employee.count({ where: { status: "RESIGNED" } }),
      prisma.department.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: { select: { employees: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        where: { status: "ACTIVE" },
        orderBy: { joiningDate: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          jobTitle: true,
          joiningDate: true,
          status: true,
          department: { select: { name: true } },
        },
      }),
    ]);

  const stats = [
    { label: "Active staff", value: totalActive, color: "text-emerald-600" },
    { label: "On leave", value: onLeave, color: "text-amber-600" },
    { label: "Resigned", value: resigned, color: "text-slate-500" },
    { label: "Terminated", value: terminated, color: "text-rose-600" },
  ];

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">HR Portal</p>
          <h1 className="font-serif text-3xl text-slate-900">People & HR</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage all CalDoc staff — onboarding, attendance, and payroll.
          </p>
        </div>
        <Link
          href="/admin/hr/staff/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
        >
          + Onboard employee
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department headcount */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Headcount by department</h2>
            <span className="text-xs text-slate-400">Active only</span>
          </div>
          <div className="space-y-3">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{d.name}</span>
                <span className="text-sm font-semibold text-slate-900">
                  {d._count.employees}
                </span>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="text-sm text-slate-400">No departments yet.</p>
            )}
          </div>
        </div>

        {/* Recent hires */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent hires</h2>
            <Link href="/admin/hr/staff" className="text-xs font-medium text-[#2f6ea5] hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentHires.map((e) => (
              <Link
                key={e.id}
                href={`/admin/hr/staff/${e.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{e.name}</p>
                  <p className="text-xs text-slate-500">
                    {e.jobTitle} · {e.department.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {e.status}
                  </span>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(e.joiningDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </Link>
            ))}
            {recentHires.length === 0 && (
              <p className="text-sm text-slate-400">No employees yet. <Link href="/admin/hr/staff/new" className="text-[#2f6ea5]">Onboard the first one →</Link></p>
            )}
          </div>
        </div>
      </div>

      {/* Phase roadmap */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">HR module phases</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { phase: "Phase 1", label: "Staff directory", status: "Live", color: "text-emerald-600" },
            { phase: "Phase 2", label: "Attendance & leave", status: "Coming soon", color: "text-amber-600" },
            { phase: "Phase 3", label: "Payroll", status: "Planned", color: "text-slate-400" },
            { phase: "Phase 4", label: "Documents & reviews", status: "Planned", color: "text-slate-400" },
          ].map((p) => (
            <div key={p.phase} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{p.phase}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{p.label}</p>
              <p className={`mt-0.5 text-xs font-medium ${p.color}`}>{p.status}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
