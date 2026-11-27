"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "consent" | "dsr" | "breaches" | "retention";

// ── Types ──────────────────────────────────────────────────────────────────────

type ConsentPatient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  consentAt: string | null;
  createdAt: string;
};

type DSR = {
  id: string;
  type: string;
  status: string;
  notes: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  patient: { id: string; name: string; phone: string };
};

type Breach = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  affectedCount: number | null;
  discoveredAt: string;
  containedAt: string | null;
  resolvedAt: string | null;
  reportedAt: string | null;
  notes: string | null;
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const DSR_TYPE_LABELS: Record<string, string> = {
  ACCESS: "Right to access",
  ERASURE: "Right to erasure",
  PORTABILITY: "Data portability",
  RECTIFICATION: "Rectification",
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-500",
  DETECTED: "bg-rose-50 text-rose-700",
  INVESTIGATING: "bg-orange-50 text-orange-700",
  CONTAINED: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  REPORTED_TO_AUTHORITY: "bg-blue-50 text-blue-700",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

// ── Tab: Consent audit ─────────────────────────────────────────────────────────

function ConsentTab() {
  const [filter, setFilter] = useState<"ALL" | "CONSENTED" | "MISSING">("ALL");
  const [patients, setPatients] = useState<ConsentPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/compliance/consent?filter=${filter}&limit=100`);
    const data = await res.json();
    setPatients(data.patients ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["ALL", "CONSENTED", "MISSING"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-[#2f6ea5] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "ALL" ? "All" : f === "CONSENTED" ? "Consented" : "Missing consent"}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{total} records</span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : patients.length === 0 ? (
        <p className="text-sm text-slate-400">No records match.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Consent given</th>
                <th className="px-4 py-3 text-left">Registered</th>
                <th className="px-4 py-3 text-left">Data export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                  <td className="px-4 py-3">
                    {p.consentAt ? (
                      <span className="text-emerald-700 font-medium">{fmt(p.consentAt)}</span>
                    ) : (
                      <span className="text-rose-600 font-medium">Not recorded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmt(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/api/admin/compliance/export/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[#2f6ea5] hover:underline"
                    >
                      Export JSON
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Data Subject Requests ─────────────────────────────────────────────────

function DsrTab() {
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/compliance/dsr${qs}&limit=100`);
    const data = await res.json();
    setDsrs(data.requests ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/admin/compliance/dsr/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <span className="text-xs text-slate-500">{total} requests</span>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="ml-auto rounded-xl bg-[#2f6ea5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b]"
        >
          + New DSR
        </button>
      </div>

      {showCreate && (
        <CreateDsrForm onCreated={() => { setShowCreate(false); load(); }} />
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : dsrs.length === 0 ? (
        <p className="text-sm text-slate-400">No data subject requests.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dsrs.map((dsr) => (
                <tr key={dsr.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{dsr.patient.name}</div>
                    <div className="text-xs text-slate-500">{dsr.patient.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{DSR_TYPE_LABELS[dsr.type] ?? dsr.type}</td>
                  <td className="px-4 py-3">
                    <Badge label={dsr.status} colorClass={STATUS_COLORS[dsr.status] ?? "bg-slate-100 text-slate-600"} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmt(dsr.requestedAt)}</td>
                  <td className="px-4 py-3">
                    {dsr.status === "PENDING" && (
                      <div className="flex gap-1.5">
                        <button
                          disabled={updating === dsr.id}
                          onClick={() => updateStatus(dsr.id, "IN_PROGRESS")}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          Start
                        </button>
                        <button
                          disabled={updating === dsr.id}
                          onClick={() => updateStatus(dsr.id, "REJECTED")}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {dsr.status === "IN_PROGRESS" && (
                      <button
                        disabled={updating === dsr.id}
                        onClick={() => updateStatus(dsr.id, "COMPLETED")}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Mark complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateDsrForm({ onCreated }: { onCreated: () => void }) {
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("ACCESS");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/compliance/dsr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, type, notes }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    onCreated();
  }

  const field = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30";

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">New data subject request</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient ID</label>
          <input value={patientId} onChange={(e) => setPatientId(e.target.value)} required placeholder="cuid…" className={field} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
            <option value="ACCESS">Right to access</option>
            <option value="ERASURE">Right to erasure</option>
            <option value="PORTABILITY">Data portability</option>
            <option value="RECTIFICATION">Rectification</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={field} />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="rounded-xl bg-[#2f6ea5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50">
          {loading ? "Creating…" : "Create DSR"}
        </button>
      </div>
    </form>
  );
}

// ── Tab: Breach Notifications ──────────────────────────────────────────────────

function BreachesTab() {
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/compliance/breaches");
    const data = await res.json();
    setBreaches(data.breaches ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function action(id: string, act: "CONTAIN" | "RESOLVE" | "REPORT") {
    await fetch(`/api/admin/compliance/breaches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">
          CERT-In / DPA reporting required within 72 hours of discovery for CRITICAL/HIGH breaches.
        </p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
        >
          + Log breach
        </button>
      </div>

      {showCreate && (
        <CreateBreachForm onCreated={() => { setShowCreate(false); load(); }} />
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : breaches.length === 0 ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-emerald-800">No breach incidents recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {breaches.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex flex-wrap gap-2 items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{b.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge label={b.severity} colorClass={SEVERITY_COLORS[b.severity] ?? ""} />
                  <Badge label={b.status.replace(/_/g, " ")} colorClass={STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-4">
                <span>Discovered: <strong>{fmt(b.discoveredAt)}</strong></span>
                <span>Affected: <strong>{b.affectedCount ?? "Unknown"}</strong></span>
                <span>Contained: <strong>{fmt(b.containedAt)}</strong></span>
                <span>Reported to DPA: <strong>{fmt(b.reportedAt)}</strong></span>
              </div>

              {b.notes && <p className="text-xs text-slate-600 italic">{b.notes}</p>}

              {/* Action buttons based on current status */}
              {!["RESOLVED", "REPORTED_TO_AUTHORITY"].includes(b.status) && (
                <div className="flex gap-2 pt-1">
                  {b.status !== "CONTAINED" && !b.containedAt && (
                    <button
                      onClick={() => action(b.id, "CONTAIN")}
                      className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                    >
                      Mark contained
                    </button>
                  )}
                  <button
                    onClick={() => action(b.id, "RESOLVE")}
                    className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => action(b.id, "REPORT")}
                    className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Mark reported to authority
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateBreachForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", severity: "HIGH",
    discoveredAt: new Date().toISOString().slice(0, 16),
    affectedCount: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/compliance/breaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        affectedCount: form.affectedCount ? parseInt(form.affectedCount) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    onCreated();
  }

  const field = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300";

  return (
    <form onSubmit={submit} className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-rose-900">Log new breach incident</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="Brief title" className={field} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} required rows={2} placeholder="What happened, what data was involved…" className={field} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Severity</label>
          <select value={form.severity} onChange={(e) => set("severity", e.target.value)} className={field}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discovered at</label>
          <input type="datetime-local" value={form.discoveredAt} onChange={(e) => set("discoveredAt", e.target.value)} required className={field} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Affected records (est.)</label>
          <input type="number" min={0} value={form.affectedCount} onChange={(e) => set("affectedCount", e.target.value)} placeholder="Leave blank if unknown" className={field} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
          <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" className={field} />
        </div>
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
        {loading ? "Saving…" : "Log incident"}
      </button>
    </form>
  );
}

// ── Tab: Data Retention Policy (static display) ────────────────────────────────

function RetentionTab() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Data retention policy</h3>
        <p className="text-xs text-slate-500">
          Per DPDP Act 2023 and MoHFW telemedicine guidelines. These are the default retention periods.
          Patients may invoke right-to-erasure via the app, subject to legal hold for clinical records.
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
              <th className="pb-2 text-left">Data category</th>
              <th className="pb-2 text-left">Retention period</th>
              <th className="pb-2 text-left">Legal basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
            {RETENTION_POLICY.map((row) => (
              <tr key={row.category}>
                <td className="py-2 font-medium">{row.category}</td>
                <td className="py-2">{row.retention}</td>
                <td className="py-2 text-slate-500">{row.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">72-hour breach reporting obligation</p>
        <p>
          Any personal data breach must be reported to CERT-In (Indian Computer Emergency Response Team)
          within 72 hours of becoming aware. Log incidents in the Breach Notifications tab above.
          Notify affected patients as required under Section 8(6) of the DPDP Act.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800 space-y-1">
        <p className="font-semibold">Right to erasure — clinical records exception</p>
        <p>
          Prescription and clinical records must be retained for the statutory minimum of 3 years
          (Telemedicine Practice Guidelines 2020). An erasure request for such records should be
          acknowledged as &ldquo;legally held&rdquo; rather than processed, and must not delete
          medical records needed for patient safety or medicolegal purposes.
        </p>
      </div>
    </div>
  );
}

const RETENTION_POLICY = [
  { category: "Clinical records (prescriptions, visit notes)", retention: "3 years minimum", basis: "MoHFW Telemedicine Guidelines 2020" },
  { category: "Patient profile & contact", retention: "Active + 2 years after last activity", basis: "DPDP Act 2023 §8(3)" },
  { category: "Payment records & invoices", retention: "7 years", basis: "Income Tax Act §44" },
  { category: "Lab/Rx order records", retention: "3 years", basis: "Drugs & Cosmetics Act" },
  { category: "Appointment metadata", retention: "5 years", basis: "MCI / NMC regulations" },
  { category: "Audit logs", retention: "5 years", basis: "DPDP Act + IT Act §43A" },
  { category: "Session tokens / OTPs", retention: "Deleted on expiry", basis: "DPDP Act minimum necessary" },
  { category: "Profile photos", retention: "Active account duration", basis: "DPDP Act §8(3)" },
];

// ── Root component ─────────────────────────────────────────────────────────────

export default function ComplianceClient() {
  const [tab, setTab] = useState<Tab>("consent");

  const tabs: { key: Tab; label: string }[] = [
    { key: "consent", label: "Consent audit" },
    { key: "dsr", label: "Data subject requests" },
    { key: "breaches", label: "Breach notifications" },
    { key: "retention", label: "Retention policy" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Tab bar */}
      <div className="border-b border-slate-200 flex overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-b-2 border-[#2f6ea5] text-[#2f6ea5]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "consent" && <ConsentTab />}
        {tab === "dsr" && <DsrTab />}
        {tab === "breaches" && <BreachesTab />}
        {tab === "retention" && <RetentionTab />}
      </div>
    </div>
  );
}
