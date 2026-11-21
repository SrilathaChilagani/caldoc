"use client";

import { useState } from "react";
import Link from "next/link";

type Department = { id: string; name: string };
type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  employeeType: string;
  status: string;
  workLocation: string;
  joiningDate: string;
  systemRole: string | null;
  department: { id: string; name: string };
  reportingManager: { id: string; name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ON_LEAVE: "bg-amber-50 text-amber-700",
  TERMINATED: "bg-rose-50 text-rose-700",
  RESIGNED: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

const LOCATION_LABELS: Record<string, string> = {
  OFFICE: "Office",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  FIELD: "Field",
};

export default function StaffDirectoryClient({
  employees,
  departments,
}: {
  employees: Employee[];
  departments: Department[];
}) {
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");

  const filtered = employees.filter((e) => {
    const matchQ =
      !q ||
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.email.toLowerCase().includes(q.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(q.toLowerCase()) ||
      e.jobTitle.toLowerCase().includes(q.toLowerCase());
    const matchStatus = filterStatus === "ALL" || e.status === filterStatus;
    const matchDept = filterDept === "ALL" || e.department.id === filterDept;
    return matchQ && matchStatus && matchDept;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name, email, code, title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30 w-72"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On leave</option>
          <option value="RESIGNED">Resigned</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        >
          <option value="ALL">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <span className="ml-auto self-center text-xs text-slate-400">
          {filtered.length} of {employees.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Type</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">Location</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.employeeCode} · {e.jobTitle}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{e.department.name}</td>
                <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                  {TYPE_LABELS[e.employeeType] ?? e.employeeType}
                </td>
                <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                  {LOCATION_LABELS[e.workLocation] ?? e.workLocation}
                </td>
                <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                  {new Date(e.joiningDate).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {e.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/hr/staff/${e.id}`}
                    className="text-xs font-medium text-[#2f6ea5] hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No employees found.{" "}
                  <Link href="/admin/hr/staff/new" className="text-[#2f6ea5]">Onboard one →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
