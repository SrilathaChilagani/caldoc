"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  reservationId: string;
  initialAmountPaise?: number | null;
  initialNotes?: string | null;
  apiPrefix?: string;
};

function paiseToDisplay(paise?: number | null) {
  if (typeof paise !== "number" || Number.isNaN(paise)) return "";
  return (paise / 100).toFixed(2);
}

function parseAmount(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

export default function EditReservationButton({
  reservationId,
  initialAmountPaise,
  initialNotes,
  apiPrefix = "/api/ngo/reservations",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(() => paiseToDisplay(initialAmountPaise));
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountPaise = parseAmount(amountInput);
    try {
      const res = await fetch(`${apiPrefix}/${reservationId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Unable to update");
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update");
    }
  }

  return (
    <div className="space-y-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Edit
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700" htmlFor={`amount-${reservationId}`}>
              Amount (INR)
            </label>
            <input
              id={`amount-${reservationId}`}
              type="number"
              step="0.01"
              min="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm text-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700" htmlFor={`notes-${reservationId}`}>
              Notes
            </label>
            <textarea
              id={`notes-${reservationId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm text-slate-900"
            />
          </div>
          {error && <p className="text-rose-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#2f6ea5] px-3 py-1 text-xs font-semibold text-white hover:bg-[#255b8b] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAmountInput(paiseToDisplay(initialAmountPaise));
                setNotes(initialNotes ?? "");
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
