"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "PENDING",          label: "Pending" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "CONFIRMED",        label: "Confirmed" },
  { value: "SAMPLE_COLLECTED", label: "Sample collected" },
  { value: "PROCESSING",       label: "Processing" },
  { value: "REPORTS_READY",    label: "Reports ready" },
  { value: "COMPLETED",        label: "Completed" },
  { value: "CANCELLED",        label: "Cancelled" },
];

type LabPartner = { id: string; name: string };

export default function LabOrderActions({
  orderId,
  currentStatus,
  currentLabPartnerId,
  labPartners,
}: {
  orderId: string;
  currentStatus: string;
  currentLabPartnerId: string | null;
  labPartners: LabPartner[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [partnerId, setPartnerId] = useState(currentLabPartnerId ?? "");
  const [note, setNote] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function open_() { setStatus(currentStatus); setPartnerId(currentLabPartnerId??""); setNote(""); setErr(null); setOpen(true); }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = {};
      if (status !== currentStatus) body.status = status;
      body.labPartnerId = partnerId || null;
      if (note.trim()) body.note = note.trim();
      if (agentName.trim()) body.collectionAgentName = agentName.trim();
      if (agentPhone.trim()) body.collectionAgentPhone = agentPhone.trim();

      const res = await fetch(`/api/frontdesk/lab-orders/${orderId}/status`, {
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
              <h2 className="font-serif text-lg font-semibold text-slate-900">Manage lab order</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Status */}
            <p className="mt-4 mb-2 text-xs font-semibold uppercase text-slate-500">Status</p>
            <div className="space-y-1">
              {STATUSES.map(s => (
                <label key={s.value} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                  <input type="radio" name="lab-status" value={s.value} checked={status===s.value} onChange={()=>setStatus(s.value)} className="accent-[#2f6ea5]"/>
                  <span className="text-sm font-medium text-slate-700">{s.label}</span>
                </label>
              ))}
            </div>

            {/* Lab partner */}
            <p className="mt-4 mb-2 text-xs font-semibold uppercase text-slate-500">Lab partner</p>
            <select
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"
            >
              <option value="">Unassigned</option>
              {labPartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Collection agent */}
            <p className="mt-3 mb-2 text-xs font-semibold uppercase text-slate-500">Collection agent (optional)</p>
            <input value={agentName} onChange={e=>setAgentName(e.target.value)} placeholder="Name" className="mb-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"/>
            <input value={agentPhone} onChange={e=>setAgentPhone(e.target.value)} placeholder="Phone" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"/>

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
