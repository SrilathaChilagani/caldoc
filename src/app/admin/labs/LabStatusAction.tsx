"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SAMPLE_COLLECTED",
  "PROCESSING",
  "REPORTS_READY",
  "COMPLETED",
  "CANCELLED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  SAMPLE_COLLECTED: "Sample collected",
  PROCESSING: "Processing",
  REPORTS_READY: "Reports ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function LabStatusAction({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (selected === currentStatus) { setOpen(false); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lab-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update");
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setSelected(currentStatus); setError(null); setOpen(true); }}
        className="rounded-full border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
      >
        Update status
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Update lab order status</h2>
            <div className="mt-4 space-y-2">
              {STATUSES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="lab-status"
                    value={s}
                    checked={selected === s}
                    onChange={() => setSelected(s)}
                    className="accent-[#2f6ea5]"
                  />
                  <span className="text-sm font-medium text-slate-700">{STATUS_LABELS[s]}</span>
                </label>
              ))}
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
