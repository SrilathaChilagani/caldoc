"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

type Slot = { id: string; startsAt: string; feePaise: number | null };
type Provider = { id: string; name: string; speciality: string; slots: Slot[] };

export default function AdminAppointmentActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<"cancel" | "reassign" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reassign state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const isCancelled = currentStatus === "CANCELLED" || currentStatus === "CANCELED";

  useEffect(() => {
    if (open === "reassign" && providers.length === 0) {
      setLoadingProviders(true);
      fetch("/api/admin/providers/available-slots")
        .then((r) => r.json())
        .then((d) => {
          setProviders(d.providers ?? []);
          if (d.providers?.length) {
            setSelectedProvider(d.providers[0].id);
            setSelectedSlot(d.providers[0].slots[0]?.id ?? "");
          }
        })
        .catch(() => setError("Failed to load providers"))
        .finally(() => setLoadingProviders(false));
    }
  }, [open, providers.length]);

  const providerSlots = providers.find((p) => p.id === selectedProvider)?.slots ?? [];

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to cancel");
      }
      setOpen(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReassign() {
    if (!selectedProvider) { setError("Select a provider"); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: selectedProvider, slotId: selectedSlot || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to reassign");
      }
      setOpen(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function formatSlot(startsAt: string) {
    return new Date(startsAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setError(null); setOpen("cancel"); }}
          disabled={isCancelled}
          className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={() => { setError(null); setOpen("reassign"); }}
          disabled={isCancelled}
          className="rounded-full border border-[#2f6ea5]/30 px-3 py-1 text-xs font-semibold text-[#2f6ea5] hover:bg-[#e7edf3] disabled:opacity-40"
        >
          Reassign
        </button>
      </div>

      {/* Cancel modal */}
      {open === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Cancel appointment?</h2>
            <p className="mt-2 text-sm text-slate-500">
              This will cancel the appointment and release the slot back to the pool.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={busy}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign modal */}
      {open === "reassign" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Reassign appointment</h2>
              <button onClick={() => setOpen(null)} className="text-sm text-slate-500 hover:text-slate-800">
                Close
              </button>
            </div>
            {loadingProviders ? (
              <p className="mt-4 text-sm text-slate-400">Loading providers…</p>
            ) : providers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No active providers with open slots found.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Select provider
                  <select
                    value={selectedProvider}
                    onChange={(e) => {
                      setSelectedProvider(e.target.value);
                      const p = providers.find((p) => p.id === e.target.value);
                      setSelectedSlot(p?.slots[0]?.id ?? "");
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.speciality} ({p.slots.length} slots)
                      </option>
                    ))}
                  </select>
                </label>
                {providerSlots.length > 0 && (
                  <label className="block text-sm font-medium text-slate-700">
                    Select slot
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">— No specific slot —</option>
                      {providerSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatSlot(s.startsAt)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {providerSlots.length === 0 && (
                  <p className="text-xs text-amber-600">This provider has no open future slots. They will be assigned without a slot.</p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setOpen(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassign}
                    disabled={busy}
                    className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
                  >
                    {busy ? "Reassigning…" : "Confirm reassignment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
