"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditReservationButton from "@/app/ngo/EditReservationButton";

type Props = {
  reservationId: string;
  status: string;
  friendlyId: string;
  amountPaise?: number | null;
  notes?: string | null;
};

type Action = "confirm" | "release" | "invoice";

export default function AdminNgoReservationActions({
  reservationId,
  status,
  friendlyId,
  amountPaise,
  notes,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  async function runAction(action: Action) {
    setError(null);
    setPendingAction(action);
    try {
      const res = await fetch(`/api/admin/ngo-reservations/${reservationId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Unable to update reservation");
      }
      startRefresh(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingAction(null);
    }
  }

  const showConfirm = status !== "CONFIRMED" && status !== "INVOICE_REQUESTED";
  const showRelease = status === "HELD";
  const showInvoice = status === "CONFIRMED";
  const loading = pendingAction !== null || isRefreshing;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap gap-2">
        {showConfirm && (
          <button
            type="button"
            onClick={() => runAction("confirm")}
            disabled={loading}
            className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingAction === "confirm" ? "Confirming…" : "Confirm block"}
          </button>
        )}
        {showRelease && (
          <button
            type="button"
            onClick={() => runAction("release")}
            disabled={loading}
            className="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingAction === "release" ? "Releasing…" : "Release slot"}
          </button>
        )}
        {showInvoice && (
          <button
            type="button"
            onClick={() => runAction("invoice")}
            disabled={loading}
            className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingAction === "invoice" ? "Marking…" : "Mark for invoice"}
          </button>
        )}
        <Link
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-blue-700 hover:bg-blue-50"
          href={`/ngo/appointments?admin=1&friendly=${friendlyId}`}
          target="_blank"
        >
          View in NGO UI
        </Link>
      </div>
      <EditReservationButton
        reservationId={reservationId}
        initialAmountPaise={amountPaise}
        initialNotes={notes}
        apiPrefix="/api/admin/ngo-reservations"
      />
      {error && <p className="text-rose-600">{error}</p>}
    </div>
  );
}
