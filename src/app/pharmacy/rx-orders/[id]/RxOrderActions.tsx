"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Only statuses pharmacy can advance to — payment states and cancellation are admin-only.
const NEXT_STATUS: Record<string, { value: string; label: string }> = {
  PAID: { value: "PROCESSING", label: "Start processing" },
  PROCESSING: { value: "DISPATCHED", label: "Mark as dispatched" },
  DISPATCHED: { value: "DELIVERED", label: "Mark as delivered" },
};

export default function RxOrderActions({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const next = NEXT_STATUS[currentStatus];
  if (!next) return null;

  const showTracking = currentStatus === "PROCESSING"; // adding tracking when dispatching

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/pharmacy/rx-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next.value,
          trackingNumber: trackingNumber || undefined,
          courierName: courierName || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setSuccess(`Order moved to ${next.label.toLowerCase()}.`);
      setNote("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showTracking && (
        <>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              Courier name
            </label>
            <input
              type="text"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              placeholder="e.g. Delhivery, BlueDart, DTDC"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              Tracking number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. DL1234567890"
              className={inputCls}
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-600">
          Note <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for this update…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#2f6ea5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
      >
        {loading ? "Saving…" : next.label}
      </button>
    </form>
  );
}
