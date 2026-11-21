"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Payslip = {
  id: string;
  status: string;
  basicPaise: number;
  hraPaise: number;
  daPaise: number;
  grossPaise: number;
  absentDeductPaise: number;
  tdsDeductPaise: number;
  otherDeductPaise: number;
  netPaise: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  totalWorkingDays: number;
  paidAt: string | null;
  paymentRef: string | null;
  notes: string | null;
  employee: { id: string; name: string; employeeCode: string; department: { name: string } };
};

type Run = {
  id: string;
  month: string;
  status: string;
};

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const SLIP_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  HELD: "bg-rose-50 text-rose-700",
};

export default function PayrollRunClient({ run }: { run: Run & { payslips: Payslip[] } }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [runUpdating, setRunUpdating] = useState(false);

  async function updatePayslip(id: string, status: "PAID" | "HELD" | "PENDING") {
    setUpdating(id);
    try {
      await fetch(`/api/admin/hr/payroll/${run.id}/payslips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentRef: payRef || null }),
      });
      setOpenId(null);
      setPayRef("");
      router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  async function markAllPaid() {
    setRunUpdating(true);
    const pending = run.payslips.filter((p) => p.status === "PENDING");
    for (const p of pending) {
      await fetch(`/api/admin/hr/payroll/${run.id}/payslips/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
    }
    setRunUpdating(false);
    router.refresh();
  }

  async function completeRun() {
    setRunUpdating(true);
    try {
      await fetch(`/api/admin/hr/payroll/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      router.refresh();
    } finally {
      setRunUpdating(false);
    }
  }

  const pendingCount = run.payslips.filter((p) => p.status === "PENDING").length;
  const isDraft = run.status === "DRAFT";

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {isDraft && (
        <div className="flex gap-3">
          <button
            onClick={markAllPaid}
            disabled={runUpdating || pendingCount === 0}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {runUpdating ? "Updating…" : `Mark all pending as paid (${pendingCount})`}
          </button>
          <button
            onClick={completeRun}
            disabled={runUpdating || pendingCount > 0}
            title={pendingCount > 0 ? "All payslips must be paid or held before completing" : ""}
            className="rounded-xl border border-[#2f6ea5] px-4 py-2 text-sm font-semibold text-[#2f6ea5] hover:bg-[#2f6ea5]/5 disabled:opacity-40"
          >
            Complete payroll run
          </button>
        </div>
      )}

      {/* Payslips table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Basic</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Deductions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Net</th>
              <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Attendance</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              {isDraft && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {run.payslips.map((p) => {
              const totalDeduct = p.absentDeductPaise + p.tdsDeductPaise + p.otherDeductPaise;
              const isOpen = openId === p.id;
              return (
                <>
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.employee.name}</p>
                      <p className="text-xs text-slate-400">{p.employee.employeeCode} · {p.employee.department.name}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(p.basicPaise)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(p.grossPaise)}</td>
                    <td className="px-4 py-3 text-right text-rose-600">-{fmt(totalDeduct)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(p.netPaise)}</td>
                    <td className="hidden px-4 py-3 text-center text-xs text-slate-500 md:table-cell">
                      <span className="text-emerald-600">{p.presentDays}P</span>{" · "}
                      <span className="text-amber-600">{p.halfDays}H</span>{" · "}
                      <span className="text-rose-500">{p.absentDays}A</span>{" · "}
                      <span className="text-blue-500">{p.leaveDays}L</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${SLIP_STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    {isDraft && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setOpenId(isOpen ? null : p.id); setPayRef(p.paymentRef ?? ""); }}
                          className="text-xs font-medium text-[#2f6ea5] hover:underline"
                        >
                          {isOpen ? "Close" : "Update"}
                        </button>
                      </td>
                    )}
                  </tr>
                  {isOpen && (
                    <tr key={`${p.id}-actions`}>
                      <td colSpan={isDraft ? 8 : 7} className="bg-slate-50 px-6 py-3">
                        <div className="flex flex-wrap gap-3 items-center">
                          <input
                            value={payRef}
                            onChange={(e) => setPayRef(e.target.value)}
                            placeholder="Payment reference (optional)"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none w-56"
                          />
                          <button onClick={() => updatePayslip(p.id, "PAID")} disabled={updating === p.id} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Mark paid</button>
                          <button onClick={() => updatePayslip(p.id, "HELD")} disabled={updating === p.id} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Hold</button>
                          <button onClick={() => updatePayslip(p.id, "PENDING")} disabled={updating === p.id} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Reset to pending</button>
                        </div>
                        {/* Breakdown */}
                        <div className="mt-2 flex gap-6 text-xs text-slate-500">
                          <span>Basic {fmt(p.basicPaise)}</span>
                          <span>HRA {fmt(p.hraPaise)}</span>
                          <span>DA {fmt(p.daPaise)}</span>
                          <span className="text-rose-500">Absent -{fmt(p.absentDeductPaise)}</span>
                          <span className="text-rose-500">TDS -{fmt(p.tdsDeductPaise)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
