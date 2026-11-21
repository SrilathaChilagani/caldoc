"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  name: string;
  employeeCode: string;
  jobTitle: string;
  department: { name: string };
};

const PERIODS = [
  "2026-H1", "2026-H2", "2026-Annual",
  "2027-H1", "2027-H2", "2027-Annual",
];

export default function NewReviewForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [period, setPeriod] = useState("2026-Annual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !reviewerId || !period) { setError("All fields are required"); return; }
    if (employeeId === reviewerId) { setError("Employee and reviewer cannot be the same person"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/hr/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, reviewerId, period }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create review");
      const data = await res.json();
      router.push(`/admin/hr/reviews/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create review");
      setSaving(false);
    }
  }

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <form onSubmit={handleSubmit} className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="space-y-1">
        <label className={labelClass}>Employee being reviewed</label>
        <select className={fieldClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employeeCode}) — {e.department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>Reviewer</label>
        <select className={fieldClass} value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} required>
          <option value="">Select reviewer…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} — {e.jobTitle}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>Review period</label>
        <select className={fieldClass} value={period} onChange={(e) => setPeriod(e.target.value)} required>
          {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create review"}
        </button>
        <a href="/admin/hr/reviews" className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </a>
      </div>
    </form>
  );
}
