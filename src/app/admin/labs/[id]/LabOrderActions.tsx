"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "PENDING", label: "Pending", color: "text-slate-600" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment", color: "text-amber-700" },
  { value: "CONFIRMED", label: "Confirmed", color: "text-blue-700" },
  { value: "SAMPLE_COLLECTED", label: "Sample collected", color: "text-indigo-700" },
  { value: "PROCESSING", label: "Processing", color: "text-violet-700" },
  { value: "REPORTS_READY", label: "Reports ready", color: "text-teal-700" },
  { value: "COMPLETED", label: "Completed", color: "text-emerald-700" },
  { value: "CANCELLED", label: "Cancelled", color: "text-red-700" },
];

export default function LabOrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [collectionAgentName, setCollectionAgentName] = useState("");
  const [collectionAgentPhone, setCollectionAgentPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/lab-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          collectionAgentName: collectionAgentName || undefined,
          collectionAgentPhone: collectionAgentPhone || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setSuccess(true);
      setNote("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const showAgent = ["SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY", "COMPLETED"].includes(status);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600">Update status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {showAgent && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Collection agent name</label>
              <input
                type="text"
                value={collectionAgentName}
                onChange={(e) => setCollectionAgentName(e.target.value)}
                placeholder="e.g. Ravi Kumar"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Collection agent phone</label>
              <input
                type="text"
                value={collectionAgentPhone}
                onChange={(e) => setCollectionAgentPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none"
              />
            </div>
          </>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">Note (optional)</label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add an internal note for this status update…"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none"
        />
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Status updated successfully.</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save update"}
      </button>
    </form>
  );
}
