"use client";

import { useState } from "react";
import Link from "next/link";

type Dept = { id: string; name: string };
type TodayRecord = { clockIn: string | null; clockOut: string | null; status: string; workMinutes: number | null } | null;
type EmployeeRow = {
  id: string;
  name: string;
  employeeCode: string;
  department: { id: string; name: string };
  today: TodayRecord;
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  ABSENT: "bg-rose-50 text-rose-700",
  HALF_DAY: "bg-amber-50 text-amber-700",
  ON_LEAVE: "bg-blue-50 text-blue-700",
  HOLIDAY: "bg-purple-50 text-purple-700",
  WEEKEND: "bg-slate-100 text-slate-500",
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtMins(mins: number | null) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function AttendanceOverviewClient({
  employees,
  departments,
  currentMonth,
}: {
  employees: EmployeeRow[];
  departments: Dept[];
  currentMonth: string;
}) {
  const [filterDept, setFilterDept] = useState("ALL");
  const [q, setQ] = useState("");

  const filtered = employees.filter((e) => {
    const matchDept = filterDept === "ALL" || e.department.id === filterDept;
    const matchQ = !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.employeeCode.toLowerCase().includes(q.toLowerCase());
    return matchDept && matchQ;
  });

  const present = filtered.filter((e) => e.today?.clockIn).length;
  const notIn = filtered.length - present;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search name or code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30 w-56"
        />
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        >
          <option value="ALL">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400">
          <span className="font-semibold text-emerald-600">{present}</span> present ·{" "}
          <span className="font-semibold text-rose-500">{notIn}</span> not clocked in
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Clock in</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Clock out</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{e.name}</p>
                  <p className="text-xs text-slate-400">{e.employeeCode}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{e.department.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{fmtTime(e.today?.clockIn ?? null)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{fmtTime(e.today?.clockOut ?? null)}</td>
                <td className="hidden px-4 py-3 text-sm text-slate-500 md:table-cell">{fmtMins(e.today?.workMinutes ?? null)}</td>
                <td className="px-4 py-3">
                  {e.today ? (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[e.today.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {e.today.status.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-400">Not in</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/hr/attendance/${e.id}?month=${currentMonth}`} className="text-xs font-medium text-[#2f6ea5] hover:underline">
                    History →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
