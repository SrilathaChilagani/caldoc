"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunPayrollClient({ suggestedMonth }: { suggestedMonth: string | null }) {
  const router = useRouter();
  const [month, setMonth] = useState(suggestedMonth ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!month) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, note }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      router.push(`/admin/hr/payroll/${j.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRun} className="rounded-2xl border border-[#2f6ea5]/20 bg-[#2f6ea5]/5 p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Run new payroll</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Month *</label>
          <input
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. November 2026 — includes Diwali bonus"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !month}
          className="rounded-xl bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
        >
          {loading ? "Calculating…" : "Run payroll"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">
        Pulls all active employees + their attendance for the selected month. Calculates Basic + HRA (40%) + DA (10%) minus absent deductions and TDS.
      </p>
    </form>
  );
}
