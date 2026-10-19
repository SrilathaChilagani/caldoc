"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  name: string;
  sig: string | null;
  qtyPrescribed: string | null;
};

type Props = {
  orderId: string;
  items: OrderItem[];
  patientName: string;
};

type ItemState = {
  status: "AVAILABLE" | "SUBSTITUTED" | "UNAVAILABLE";
  dispensedName: string;
  dispensedSig: string;
  unitPricePaise: string;
  qtyDispensed: string;
  note: string;
};

function defaultItemState(): ItemState {
  return {
    status: "AVAILABLE",
    dispensedName: "",
    dispensedSig: "",
    unitPricePaise: "",
    qtyDispensed: "1",
    note: "",
  };
}

function parsePaise(val: string): number {
  const rupees = parseFloat(val);
  if (isNaN(rupees) || rupees < 0) return 0;
  return Math.round(rupees * 100);
}

export default function RxQuoteForm({ orderId, items, patientName }: Props) {
  const router = useRouter();
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(
    () => Object.fromEntries(items.map((i) => [i.id, defaultItemState()])),
  );
  const [quoteNote, setQuoteNote] = useState("");
  const [rejectOrder, setRejectOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(id: string, patch: Partial<ItemState>) {
    setItemStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = rejectOrder
        ? { rejectOrder: true, quoteNote: quoteNote || undefined }
        : {
            quoteNote: quoteNote || undefined,
            items: items.map((item) => {
              const s = itemStates[item.id];
              const base = {
                itemId: item.id,
                status: s.status,
                note: s.note || undefined,
              };
              if (s.status === "UNAVAILABLE") return base;
              return {
                ...base,
                unitPricePaise: parsePaise(s.unitPricePaise),
                qtyDispensed: parseInt(s.qtyDispensed, 10) || 1,
                ...(s.status === "SUBSTITUTED"
                  ? {
                      dispensedName: s.dispensedName,
                      dispensedSig: s.dispensedSig || undefined,
                    }
                  : {}),
              };
            }),
          };

      const res = await fetch(`/api/pharmacy/rx-orders/${orderId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to submit quote");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-[#2f6ea5]/15 bg-[#f0f5fa] px-4 py-3 text-sm text-[#1a4a72]">
        Fill in availability and pricing for each medicine. {patientName} will receive a WhatsApp with the quote.
      </div>

      {items.map((item) => {
        const s = itemStates[item.id];
        return (
          <div key={item.id} className="rounded-3xl border border-white/70 bg-white/90 p-5 space-y-4">
            <div>
              <p className="font-semibold text-slate-900">{item.name}</p>
              {item.sig && <p className="text-xs text-slate-500">Dosage: {item.sig}</p>}
              {item.qtyPrescribed && <p className="text-xs text-slate-500">Prescribed qty: {item.qtyPrescribed}</p>}
            </div>

            {/* Status picker */}
            <div className="flex flex-wrap gap-2">
              {(["AVAILABLE", "SUBSTITUTED", "UNAVAILABLE"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateItem(item.id, { status: st })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    s.status === st
                      ? st === "AVAILABLE"
                        ? "bg-emerald-600 text-white"
                        : st === "SUBSTITUTED"
                        ? "bg-amber-500 text-white"
                        : "bg-red-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "AVAILABLE" ? "Available" : st === "SUBSTITUTED" ? "Substitute" : "Unavailable"}
                </button>
              ))}
            </div>

            {/* AVAILABLE / SUBSTITUTED fields */}
            {s.status !== "UNAVAILABLE" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {s.status === "SUBSTITUTED" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600">
                        Substitute name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={s.status === "SUBSTITUTED"}
                        value={s.dispensedName}
                        onChange={(e) => updateItem(item.id, { dispensedName: e.target.value })}
                        className={inputCls}
                        placeholder="e.g. Paracetamol 500mg IP"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600">Substitute dosage instructions</label>
                      <input
                        type="text"
                        value={s.dispensedSig}
                        onChange={(e) => updateItem(item.id, { dispensedSig: e.target.value })}
                        className={inputCls}
                        placeholder="e.g. 1 tablet twice daily"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Unit price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={s.unitPricePaise}
                    onChange={(e) => updateItem(item.id, { unitPricePaise: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. 12.50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Qty to dispense <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={s.qtyDispensed}
                    onChange={(e) => updateItem(item.id, { qtyDispensed: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-slate-600">Note to patient (optional)</label>
              <input
                type="text"
                value={s.note}
                onChange={(e) => updateItem(item.id, { note: e.target.value })}
                className={inputCls}
                placeholder="Any clarification about this item"
              />
            </div>
          </div>
        );
      })}

      {/* Global quote note */}
      <div className="rounded-3xl border border-white/70 bg-white/90 p-5">
        <label className="block text-sm font-medium text-slate-700">
          Overall note to patient <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={quoteNote}
          onChange={(e) => setQuoteNote(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30 resize-none"
          placeholder="General notes about this order…"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting || rejectOrder}
          className="flex-1 rounded-full bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
        >
          {submitting ? "Submitting quote…" : "Send quote to patient →"}
        </button>
        <button
          type="button"
          onClick={() => setRejectOrder((v) => !v)}
          className={`flex-1 rounded-full border py-3 text-sm font-medium transition-colors ${
            rejectOrder
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600"
          }`}
        >
          {rejectOrder ? "★ Will reject entire order — click Send to confirm" : "Reject entire order"}
        </button>
      </div>
    </form>
  );
}
