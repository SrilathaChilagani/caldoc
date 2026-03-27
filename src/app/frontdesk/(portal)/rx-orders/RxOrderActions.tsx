"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "PAID",             label: "Paid" },
  { value: "PROCESSING",       label: "Processing" },
  { value: "DISPATCHED",       label: "Dispatched" },
  { value: "DELIVERED",        label: "Delivered" },
  { value: "CANCELLED",        label: "Cancelled" },
];

type PharmacyPartner = { id: string; name: string };

export default function RxOrderActions({
  orderId,
  currentStatus,
  currentPharmacyPartnerId,
  pharmacyPartners,
}: {
  orderId: string;
  currentStatus: string;
  currentPharmacyPartnerId: string | null;
  pharmacyPartners: PharmacyPartner[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [partnerId, setPartnerId] = useState(currentPharmacyPartnerId ?? "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function open_() { setStatus(currentStatus); setPartnerId(currentPharmacyPartnerId??""); setNote(""); setTrackingNumber(""); setCourierName(""); setErr(null); setOpen(true); }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = {};
      if (status !== currentStatus) body.status = status;
      body.pharmacyPartnerId = partnerId || null;
      if (note.trim()) body.note = note.trim();
      if (trackingNumber.trim()) body.trackingNumber = trackingNumber.trim();
      if (courierName.trim()) body.courierName = courierName.trim();

      const res = await fetch(`/api/frontdesk/rx-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        Manage
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Manage Rx order</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Status */}
            <p className="mt-4 mb-2 text-xs font-semibold uppercase text-slate-500">Status</p>
            <div className="space-y-1">
              {STATUSES.map(s => (
                <label key={s.value} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                  <input type="radio" name="rx-status" value={s.value} checked={status===s.value} onChange={()=>setStatus(s.value)} className="accent-[#2f6ea5]"/>
                  <span className="text-sm font-medium text-slate-700">{s.label}</span>
                </label>
              ))}
            </div>

            {/* Pharmacy partner */}
            <p className="mt-4 mb-2 text-xs font-semibold uppercase text-slate-500">Pharmacy partner</p>
            <select
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"
            >
              <option value="">Unassigned</option>
              {pharmacyPartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Tracking (shown when dispatched) */}
            {(status === "DISPATCHED" || status === "DELIVERED") && (
              <>
                <p className="mt-3 mb-2 text-xs font-semibold uppercase text-slate-500">Tracking</p>
                <input value={trackingNumber} onChange={e=>setTrackingNumber(e.target.value)} placeholder="Tracking number" className="mb-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"/>
                <input value={courierName} onChange={e=>setCourierName(e.target.value)} placeholder="Courier name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"/>
              </>
            )}

            {/* Note */}
            <p className="mt-3 mb-1 text-xs font-semibold uppercase text-slate-500">Note (optional)</p>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"/>

            {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={busy} className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50">{busy?"Saving…":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
