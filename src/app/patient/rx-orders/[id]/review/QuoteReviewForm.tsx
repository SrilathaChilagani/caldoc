"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";

type SubItem = {
  id: string;
  prescribedName: string;
  dispensedName: string;
  dispensedSig: string | null;
  unitPricePaise: number;
  qtyDispensed: number;
};

type Props = {
  orderId: string;
  substitutedItems: SubItem[];
};

export default function QuoteReviewForm({ orderId, substitutedItems }: Props) {
  const router = useRouter();
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSub(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient/rx-orders/${orderId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedSubstitutions: Array.from(approved) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to confirm order");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient/rx-orders/${orderId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to cancel order");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Substitutions section */}
      {substitutedItems.length > 0 && (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="font-serif text-lg text-amber-900">Substitutions to review</h2>
          <p className="mt-1 text-sm text-amber-700">
            The pharmacy has suggested substitutes for some medicines. Tick to approve each one.
            Unticked items will be removed from your order.
          </p>
          <div className="mt-4 space-y-3">
            {substitutedItems.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  approved.has(item.id)
                    ? "border-amber-300 bg-white"
                    : "border-amber-100 bg-amber-50/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={approved.has(item.id)}
                  onChange={() => toggleSub(item.id)}
                  className="mt-0.5 h-4 w-4 rounded accent-amber-600"
                />
                <div className="flex-1 text-sm">
                  <p className="text-xs text-slate-500">Prescribed: {item.prescribedName}</p>
                  <p className="font-semibold text-slate-900">
                    Substitute: {item.dispensedName}
                  </p>
                  {item.dispensedSig && <p className="text-xs text-slate-500">{item.dispensedSig}</p>}
                  <p className="mt-0.5 text-xs text-slate-600">
                    {formatINR(item.unitPricePaise)} × {item.qtyDispensed} ={" "}
                    {formatINR(item.unitPricePaise * item.qtyDispensed)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming || rejecting}
          className="flex-1 rounded-full bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
        >
          {confirming ? "Confirming…" : "Confirm order →"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={confirming || rejecting}
          className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
        >
          {rejecting ? "Cancelling…" : "Cancel order"}
        </button>
      </div>
    </div>
  );
}
