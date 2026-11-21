"use client";

import { useState, useEffect, useCallback } from "react";

type Payout = {
  id: string;
  status: string;
  consultAmtPaise: number;
  commissionPaise: number;
  grossPayoutPaise: number;
  tdsDeductPaise: number;
  netPayoutPaise: number;
  paidAt: string | null;
  provider: { id: string; name: string; speciality: string; panNumber: string | null; bankAccountName: string | null; bankIfscCode: string | null };
  appointment: { id: string; createdAt: string };
  payoutBatch: { id: string; status: string } | null;
};

type Batch = {
  id: string;
  status: string;
  totalGrossPaise: number;
  totalTdsPaise: number;
  totalNetPaise: number;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  _count: { payouts: number };
  createdByAdmin: { email: string };
};

type TdsEntry = {
  providerId: string;
  providerName: string;
  providerPan: string | null;
  speciality: string;
  grossPaidPaise: number;
  tdsDeducted: number;
};

type RefundReq = {
  id: string;
  status: string;
  amount: number;
  reason: string;
  requestedBy: string;
  requestedByType: string;
  createdAt: string;
  processedAt: string | null;
  gatewayRefundId: string | null;
  notes: string | null;
  payment: {
    orderId: string;
    appointment: { id: string; patientName: string | null; provider: { name: string } | null } | null;
  };
};

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const TABS = ["Pending payouts", "Payout batches", "TDS / 194J", "Refunds"] as const;
type Tab = (typeof TABS)[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  PAID: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-rose-50 text-rose-700",
  DRAFT: "bg-slate-100 text-slate-600",
  PROCESSED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-500",
};

export default function FinanceDashboardClient() {
  const [tab, setTab] = useState<Tab>("Pending payouts");
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tds, setTds] = useState<{ financialYear: string; totals: { gross: number; tds: number }; entries: TdsEntry[] } | null>(null);
  const [refunds, setRefunds] = useState<RefundReq[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fy, setFy] = useState("2026-27");
  const [actionId, setActionId] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundRef, setRefundRef] = useState("");

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/finance/payouts?status=PENDING");
    if (res.ok) setPayouts(await res.json());
    setLoading(false);
  }, []);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/finance/payouts/batch");
    if (res.ok) setBatches(await res.json());
    setLoading(false);
  }, []);

  const loadTds = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/finance/tds?fy=${fy}`);
    if (res.ok) setTds(await res.json());
    setLoading(false);
  }, [fy]);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/finance/refunds?status=PENDING");
    if (res.ok) setRefunds(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "Pending payouts") loadPayouts();
    else if (tab === "Payout batches") loadBatches();
    else if (tab === "TDS / 194J") loadTds();
    else if (tab === "Refunds") loadRefunds();
  }, [tab, loadPayouts, loadBatches, loadTds, loadRefunds]);

  async function createBatch() {
    setBatchLoading(true);
    const ids = selected.size > 0 ? Array.from(selected) : undefined;
    const res = await fetch("/api/admin/finance/payouts/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutIds: ids }),
    });
    if (res.ok) { setTab("Payout batches"); setSelected(new Set()); loadBatches(); }
    setBatchLoading(false);
  }

  async function completeBatch(batchId: string, action: "COMPLETE" | "FAIL") {
    await fetch(`/api/admin/finance/payouts/batch/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadBatches();
  }

  async function processRefund(id: string, action: "APPROVE" | "REJECT") {
    setActionId(id);
    await fetch("/api/admin/finance/refunds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, gatewayRefundId: refundRef || undefined, note: refundNote || undefined }),
    });
    setActionId(""); setRefundNote(""); setRefundRef("");
    loadRefunds();
  }

  const thClass = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400";
  const tdClass = "px-4 py-3 text-sm";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-[#2f6ea5] text-[#2f6ea5]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400 py-4">Loading…</p>}

      {/* ── PENDING PAYOUTS ── */}
      {tab === "Pending payouts" && !loading && (
        <div className="space-y-3">
          {payouts.length > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">{selected.size > 0 ? `${selected.size} selected` : `${payouts.length} pending`}</p>
              <button
                onClick={createBatch}
                disabled={batchLoading}
                className="rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
              >
                {batchLoading ? "Creating…" : selected.size > 0 ? `Create batch (${selected.size})` : "Batch all pending"}
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            {payouts.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">No pending payouts.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className={thClass}>
                      <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(payouts.map(p => p.id)) : new Set())} />
                    </th>
                    {["Provider", "Consult fee", "Commission", "Gross payout", "TDS", "Net payout", "Appointment"].map(h => (
                      <th key={h} className={thClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className={tdClass}>
                        <input type="checkbox" checked={selected.has(p.id)}
                          onChange={(e) => { const s = new Set(selected); e.target.checked ? s.add(p.id) : s.delete(p.id); setSelected(s); }} />
                      </td>
                      <td className={tdClass}>
                        <p className="font-medium text-slate-900">{p.provider.name}</p>
                        <p className="text-xs text-slate-400">{p.provider.speciality}</p>
                        {!p.provider.bankIfscCode && <p className="text-xs text-rose-500">Bank details missing</p>}
                      </td>
                      <td className={tdClass}>{fmt(p.consultAmtPaise)}</td>
                      <td className={tdClass + " text-slate-500"}>{fmt(p.commissionPaise)}</td>
                      <td className={tdClass}>{fmt(p.grossPayoutPaise)}</td>
                      <td className={tdClass + " text-amber-700"}>{p.tdsDeductPaise > 0 ? fmt(p.tdsDeductPaise) : "—"}</td>
                      <td className={tdClass + " font-semibold text-slate-900"}>{fmt(p.netPayoutPaise)}</td>
                      <td className={tdClass + " text-slate-400 text-xs"}>{new Date(p.appointment.createdAt).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── PAYOUT BATCHES ── */}
      {tab === "Payout batches" && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          {batches.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-400">No batches yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["Date", "Status", "Payouts", "Gross", "TDS", "Net", "Actions"].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className={tdClass}>{new Date(b.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className={tdClass}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className={tdClass}>{b._count.payouts}</td>
                    <td className={tdClass}>{fmt(b.totalGrossPaise)}</td>
                    <td className={tdClass + " text-amber-700"}>{b.totalTdsPaise > 0 ? fmt(b.totalTdsPaise) : "—"}</td>
                    <td className={tdClass + " font-semibold"}>{fmt(b.totalNetPaise)}</td>
                    <td className={tdClass}>
                      {b.status === "PROCESSING" && (
                        <div className="flex gap-2">
                          <button onClick={() => completeBatch(b.id, "COMPLETE")} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                            Mark paid
                          </button>
                          <button onClick={() => completeBatch(b.id, "FAIL")} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            Fail
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TDS ── */}
      {tab === "TDS / 194J" && !loading && tds && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={fy} onChange={(e) => setFy(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none">
              {["2025-26", "2026-27", "2027-28"].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total gross paid", value: fmt(tds.totals.gross) },
              { label: "Total TDS deducted", value: fmt(tds.totals.tds), color: "text-amber-700" },
              { label: "Providers with TDS", value: tds.entries.filter(e => e.tdsDeducted > 0).length.toString() },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color ?? "text-slate-900"}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["Provider", "PAN", "Speciality", "Gross paid", "TDS deducted"].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tds.entries.map((e) => (
                  <tr key={e.providerId} className="hover:bg-slate-50">
                    <td className={tdClass + " font-medium text-slate-900"}>{e.providerName}</td>
                    <td className={tdClass + " font-mono text-xs text-slate-500"}>{e.providerPan ?? <span className="text-rose-500">Missing</span>}</td>
                    <td className={tdClass + " text-slate-500"}>{e.speciality}</td>
                    <td className={tdClass}>{fmt(e.grossPaidPaise)}</td>
                    <td className={tdClass}>{e.tdsDeducted > 0 ? <span className="font-semibold text-amber-700">{fmt(e.tdsDeducted)}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REFUNDS ── */}
      {tab === "Refunds" && !loading && (
        <div className="space-y-4">
          {refunds.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No pending refund requests.</p>
          ) : (
            refunds.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.payment.appointment?.patientName ?? "Patient"} → {r.payment.appointment?.provider?.name ?? "Doctor"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Razorpay order: {r.payment.orderId} · {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Reason: {r.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{fmt(r.amount)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
                {r.status === "PENDING" && (
                  <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-100">
                    <input placeholder="Razorpay refund ID (optional)" value={refundRef} onChange={(e) => setRefundRef(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30 w-56" />
                    <input placeholder="Note (optional)" value={refundNote} onChange={(e) => setRefundNote(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30 flex-1" />
                    <button onClick={() => processRefund(r.id, "APPROVE")} disabled={actionId === r.id}
                      className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {actionId === r.id ? "…" : "Approve"}
                    </button>
                    <button onClick={() => processRefund(r.id, "REJECT")} disabled={actionId === r.id}
                      className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
