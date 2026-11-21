"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Dept = { id: string; name: string };
type Manager = { id: string; name: string; jobTitle: string };

const SYSTEM_ROLES = [
  { value: "", label: "None (no system account)" },
  { value: "ADMIN", label: "Admin portal user" },
  { value: "FRONTDESK", label: "Front desk user" },
  { value: "LAB", label: "Lab portal user" },
  { value: "PHARMACY", label: "Pharmacy portal user" },
  { value: "PROVIDER", label: "Provider / Doctor" },
];

export default function OnboardEmployeeForm({
  departments,
  managers,
}: {
  departments: Dept[];
  managers: Manager[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    departmentId: departments[0]?.id ?? "",
    jobTitle: "",
    employeeType: "FULL_TIME",
    workLocation: "OFFICE",
    joiningDate: new Date().toISOString().slice(0, 10),
    reportingManagerId: "",
    basicSalaryPaise: "",
    systemRole: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hr/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basicSalaryPaise: form.basicSalaryPaise ? parseInt(form.basicSalaryPaise) * 100 : 0,
          reportingManagerId: form.reportingManagerId || null,
          systemRole: form.systemRole || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Failed to create employee");
      }
      const emp = await res.json();
      router.push(`/admin/hr/staff/${emp.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30";
  const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Personal details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Full name *</label>
            <input required className={fieldClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input required type="email" className={fieldClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <input required className={fieldClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Date of birth</label>
            <input type="date" className={fieldClass} value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select className={fieldClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employment details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Employment details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Department *</label>
            <select required className={fieldClass} value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Job title *</label>
            <input required className={fieldClass} value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. Lab Coordinator" />
          </div>
          <div>
            <label className={labelClass}>Employment type</label>
            <select className={fieldClass} value={form.employeeType} onChange={(e) => set("employeeType", e.target.value)}>
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Work location</label>
            <select className={fieldClass} value={form.workLocation} onChange={(e) => set("workLocation", e.target.value)}>
              <option value="OFFICE">Office</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="FIELD">Field</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Joining date *</label>
            <input required type="date" className={fieldClass} value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Reporting manager</label>
            <select className={fieldClass} value={form.reportingManagerId} onChange={(e) => set("reportingManagerId", e.target.value)}>
              <option value="">None</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.jobTitle}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Basic salary (₹/month)</label>
            <input type="number" min="0" className={fieldClass} value={form.basicSalaryPaise} onChange={(e) => set("basicSalaryPaise", e.target.value)} placeholder="e.g. 25000" />
          </div>
          <div>
            <label className={labelClass}>System portal role</label>
            <select className={fieldClass} value={form.systemRole} onChange={(e) => set("systemRole", e.target.value)}>
              {SYSTEM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Emergency contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Contact name</label>
            <input className={fieldClass} value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Contact phone</label>
            <input className={fieldClass} value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Home address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Address line 1</label>
            <input className={fieldClass} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address line 2</label>
            <input className={fieldClass} value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input className={fieldClass} value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input className={fieldClass} value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Pincode</label>
            <input className={fieldClass} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <label className={labelClass}>Internal notes</label>
        <textarea rows={3} className={fieldClass} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes about this employee (internal only)" />
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Onboard employee"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
