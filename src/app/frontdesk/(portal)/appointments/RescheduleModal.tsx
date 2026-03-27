"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Slot = { id: string; startsAt: string; endsAt: string };

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", weekday: "short", day: "numeric",
  month: "short", hour: "numeric", minute: "2-digit", hour12: true,
});

function toISTDateStr(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

export default function RescheduleModal({
  appointmentId, patientName, providerName, freeSlots, currentSlotStartsAt,
}: {
  appointmentId: string;
  patientName: string;
  providerName: string;
  providerId: string;
  currentSlotId: string | null;
  currentSlotStartsAt: string;
  freeSlots: Slot[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Group by IST date
  const grouped: Record<string, Slot[]> = {};
  for (const s of freeSlots) {
    const k = toISTDateStr(s.startsAt);
    (grouped[k] ??= []).push(s);
  }
  const days = Object.keys(grouped).sort();

  function open_() { setSelected(null); setErr(null); setOpen(true); }

  async function confirm() {
    if (!selected) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/frontdesk/appointments/${appointmentId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selected }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button
        onClick={open_}
        className="rounded-full border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
      >
        Reschedule
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-slate-900">Reschedule appointment</h2>
                <p className="mt-0.5 text-sm text-slate-500">{patientName} · {providerName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Current: {IST.format(new Date(currentSlotStartsAt))}
            </p>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-3 pr-1">
              {days.length === 0 && (
                <p className="text-sm text-slate-400">No free slots available for this provider.</p>
              )}
              {days.map(day => (
                <div key={day}>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{day}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {grouped[day].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s.id)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                          selected === s.id
                            ? "border-[#2f6ea5] bg-[#e7edf3] text-[#2f6ea5]"
                            : "border-slate-200 text-slate-700 hover:border-[#2f6ea5]/50"
                        }`}
                      >
                        {IST.format(new Date(s.startsAt))}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={!selected || busy}
                className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Confirm reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
