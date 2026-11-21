import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import PayrollRunClient from "./PayrollRunClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ runId: string }> };

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

export default async function PayrollRunPage({ params }: Props) {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const { runId } = await params;

  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      payslips: {
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } },
          },
        },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!run) notFound();

  const totalGross = run.payslips.reduce((s, p) => s + p.grossPaise, 0);
  const totalNet = run.payslips.reduce((s, p) => s + p.netPaise, 0);
  const totalTds = run.payslips.reduce((s, p) => s + p.tdsDeductPaise, 0);
  const paidCount = run.payslips.filter((p) => p.status === "PAID").length;

  const monthLabel = new Date(run.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });

  const serialized = {
    ...run,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    processedAt: run.processedAt?.toISOString() ?? null,
    payslips: run.payslips.map((p) => ({
      ...p,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/hr/payroll" className="text-xs font-medium text-[#2f6ea5] hover:underline">
            ← Payroll
          </Link>
          <h1 className="mt-1 font-serif text-3xl text-slate-900">{monthLabel}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {run.payslips.length} employees · {paidCount} paid
          </p>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[run.status] ?? "bg-slate-100 text-slate-600"}`}>
          {run.status}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total gross", value: fmt(totalGross), color: "text-slate-700" },
          { label: "TDS deducted", value: fmt(totalTds), color: "text-amber-600" },
          { label: "Total net payout", value: fmt(totalNet), color: "text-emerald-600" },
          { label: "Paid out", value: `${paidCount} / ${run.payslips.length}`, color: "text-[#2f6ea5]" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {run.note && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          {run.note}
        </div>
      )}

      <PayrollRunClient run={serialized} />
    </>
  );
}
