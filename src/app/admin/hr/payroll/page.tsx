import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import RunPayrollClient from "./RunPayrollClient";

export const dynamic = "force-dynamic";

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
  PROCESSING: "bg-blue-50 text-blue-700",
};

export default async function PayrollPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/admin/hr/payroll");

  const runs = await prisma.payrollRun.findMany({
    orderBy: { month: "desc" },
    include: {
      _count: { select: { payslips: true } },
      payslips: { select: { status: true, netPaise: true } },
    },
  });

  const serialized = runs.map((r) => ({
    id: r.id,
    month: r.month,
    status: r.status,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
    totalEmployees: r._count.payslips,
    totalNetPaise: r.payslips.reduce((s, p) => s + p.netPaise, 0),
    paidCount: r.payslips.filter((p) => p.status === "PAID").length,
    pendingCount: r.payslips.filter((p) => p.status === "PENDING").length,
  }));

  // Suggest next unrun month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const runMonths = new Set(runs.map((r) => r.month));
  const suggestedMonth = runMonths.has(thisMonth)
    ? null
    : thisMonth;

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">HR Portal</p>
          <h1 className="font-serif text-3xl text-slate-900">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monthly salary runs for all active employees.
          </p>
        </div>
      </div>

      <RunPayrollClient suggestedMonth={suggestedMonth} />

      {/* Runs list */}
      <div className="space-y-3">
        {serialized.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No payroll runs yet</p>
            <p className="mt-1 text-xs text-slate-400">Run your first payroll above.</p>
          </div>
        )}
        {serialized.map((r) => (
          <Link
            key={r.id}
            href={`/admin/hr/payroll/${r.id}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {new Date(r.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {r.totalEmployees} employees · {r.paidCount} paid · {r.pendingCount} pending
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{fmt(r.totalNetPaise)}</p>
                <p className="text-xs text-slate-400">total net</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                {r.status}
              </span>
              <span className="text-slate-300">→</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
