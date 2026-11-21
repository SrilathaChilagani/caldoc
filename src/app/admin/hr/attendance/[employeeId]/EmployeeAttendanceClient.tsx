"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Day = {
  date: string;
  dayOfWeek: number;
  record: { status: string; clockIn?: string | null; clockOut?: string | null; workMinutes?: number | null } | null;
};
type Leave = { fromDate: string; toDate: string; leaveType: string; totalDays: number };

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ABSENT: "bg-rose-100 text-rose-700 border-rose-200",
  HALF_DAY: "bg-amber-100 text-amber-700 border-amber-200",
  ON_LEAVE: "bg-blue-100 text-blue-700 border-blue-200",
  HOLIDAY: "bg-purple-100 text-purple-700 border-purple-200",
  WEEKEND: "bg-slate-50 text-slate-400 border-slate-100",
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function EmployeeAttendanceClient({
  employeeId,
  calendarDays,
  month,
  leaves,
}: {
  employeeId: string;
  calendarDays: Day[];
  month: string;
  leaves: Leave[];
}) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [markStatus, setMarkStatus] = useState("PRESENT");

  async function markAttendance(date: string) {
    setMarking(date);
    try {
      await fetch("/api/admin/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, date, status: markStatus }),
      });
      router.refresh();
    } finally {
      setMarking(null);
    }
  }

  const firstDay = calendarDays[0]?.dayOfWeek ?? 0;
  const [y, mo] = month.split("-").map(Number);
  const monthLabel = new Date(y, mo - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Month nav + mark controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => router.push(`?month=${prevMonth(month)}`)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >← Prev</button>
        <span className="font-semibold text-slate-900">{monthLabel}</span>
        <button
          onClick={() => router.push(`?month=${nextMonth(month)}`)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >Next →</button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Mark selected as:</span>
          <select
            value={markStatus}
            onChange={(e) => setMarkStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half day</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="WEEKEND">Weekend</option>
          </select>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold uppercase text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for first day offset */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {calendarDays.map((day) => {
            const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
            const status = day.record?.status ?? (isWeekend ? "WEEKEND" : null);
            const colorClass = status ? STATUS_COLORS[status] ?? "bg-slate-50 border-slate-100 text-slate-500" : "bg-white border-slate-100 text-slate-500";
            return (
              <button
                key={day.date}
                onClick={() => markAttendance(day.date)}
                disabled={marking === day.date}
                title={`${day.date}${status ? ` — ${status}` : ""}`}
                className={`aspect-square rounded-lg border text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 ${colorClass}`}
              >
                {new Date(day.date + "T00:00:00").getDate()}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(STATUS_COLORS).map(([k, v]) => (
            <span key={k} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${v}`}>
              {k.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      {/* Approved leaves this month */}
      {leaves.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Approved leaves this month</h2>
          <div className="space-y-2">
            {leaves.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{l.fromDate} → {l.toDate} ({l.totalDays} days)</span>
                <span className="text-xs font-semibold text-blue-600">{l.leaveType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
