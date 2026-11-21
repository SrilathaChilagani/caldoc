"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Dept = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  status: string;
  jobTitle: string;
  departmentId: string;
  basicSalaryPaise: number;
  workLocation: string;
  employeeType: string;
  notes: string | null;
  exitDate: string | null;
  exitReason: string | null;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "RESIGNED", label: "Resigned" },
  { value: "TERMINATED", label: "Terminated" },
];

export default function EmployeeActions({ employee, departments }: { employee: Employee; departments: Dept[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [status, setStatus] = useState(employee.status);
  const [departmentId, setDepartmentId] = useState(employee.departmentId);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle);
  const [workLocation, setWorkLocation] = useState(employee.workLocation);
  const [employeeType, setEmployeeType] = useState(employee.employeeType);
  const [basicSalary, setBasicSalary] = useState(
    employee.basicSalaryPaise ? String(employee.basicSalaryPaise / 100) : ""
  );
  const [exitDate, setExitDate] = useState(
    employee.exitDate ? employee.exitDate.slice(0, 10) : ""
  );
  const [exitReason, setExitReason] = useState(employee.exitReason ?? "");
  const [notes, setNotes] = useState(employee.notes ?? "");

  const isExited = status === "RESIGNED" || status === "TERMINATED";

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/hr/staff/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          departmentId,
          jobTitle,
          workLocation,
          employeeType,
          basicSalaryPaise: basicSalary ? parseInt(basicSalary) * 100 : 0,
          exitDate: exitDate || null,
          exitReason: exitReason || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Save failed");
      }
      setSuccess("Saved successfully.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30";
  const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Update employee</h2>

        <div>
          <label className={labelClass}>Status</label>
          <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Department</label>
          <select className={fieldClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Job title</label>
          <input className={fieldClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Type</label>
          <select className={fieldClass} value={employeeType} onChange={(e) => setEmployeeType(e.target.value)}>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Work location</label>
          <select className={fieldClass} value={workLocation} onChange={(e) => setWorkLocation(e.target.value)}>
            <option value="OFFICE">Office</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="FIELD">Field</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Basic salary (₹/month)</label>
          <input type="number" min="0" className={fieldClass} value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} />
        </div>

        {isExited && (
          <>
            <div>
              <label className={labelClass}>Exit date</label>
              <input type="date" className={fieldClass} value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Exit reason</label>
              <textarea rows={2} className={fieldClass} value={exitReason} onChange={(e) => setExitReason(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Internal notes</label>
          <textarea rows={3} className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        {success && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{success}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
