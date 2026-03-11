"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

type Appt = {
  id: string;
  patientName: string;
  patientPhone?: string;
  status: string;
  videoRoom?: string;
  visitMode?: string;
  startsAt: string;
  endsAt: string;
};

type View = "day" | "week" | "month";

// ── Constants ──────────────────────────────────────────────────────────────────

const HOUR_PX = 64;       // pixels per hour
const DAY_START = 7;      // 07:00 IST
const DAY_END = 20;       // 20:00 IST
const GRID_H = (DAY_END - DAY_START) * HOUR_PX;
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_BLOCK: Record<string, string> = {
  CONFIRMED:   "bg-emerald-100 text-emerald-800 border-emerald-300",
  PENDING:     "bg-amber-100  text-amber-800  border-amber-300",
  CANCELLED:   "bg-slate-100  text-slate-500  border-slate-300",
  CANCELED:    "bg-slate-100  text-slate-500  border-slate-300",
  NO_SHOW:     "bg-rose-100   text-rose-700   border-rose-300",
  RESCHEDULED: "bg-purple-100 text-purple-700 border-purple-300",
};

const STATUS_DOT: Record<string, string> = {
  CONFIRMED:   "bg-emerald-500",
  PENDING:     "bg-amber-400",
  CANCELLED:   "bg-slate-400",
  CANCELED:    "bg-slate-400",
  NO_SHOW:     "bg-rose-400",
  RESCHEDULED: "bg-purple-400",
};

function blockColor(s: string) {
  return STATUS_BLOCK[s] ?? "bg-blue-100 text-blue-800 border-blue-300";
}
function dotColor(s: string) {
  return STATUS_DOT[s] ?? "bg-blue-500";
}

// ── IST date utilities ─────────────────────────────────────────────────────────

/** "YYYY-MM-DD" in IST for a given Date */
function toISTStr(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata" }).format(d);
}

/** IST hour (0-23) and minute for a Date */
function istHourMin(d: Date): { h: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const min = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { h: h === 24 ? 0 : h, min };
}

/** Add N days to an IST date string */
function addDays(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Add N months to an IST date string (result is always the 1st) */
function addMonths(s: string, n: number): string {
  const [y, m] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Day-of-week index where Mon=0, Sun=6 */
function dowMon(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

/** Monday of the week containing an IST date string */
function mondayOf(s: string): string {
  return addDays(s, -dowMon(s));
}

/** UTC Date for IST midnight of a date string (for API range queries) */
function istMidnightUTC(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 3600 * 1000);
}

/** IST date string from an ISO timestamp string */
function apptISTDate(iso: string): string {
  return toISTStr(new Date(iso));
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function fmtDayLabel(s: string, short?: boolean): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: short ? "short" : "long",
    day: "numeric",
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function fmtMonthYear(s: string): string {
  const [y, m] = s.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 15, 12)));
}

// ── Fetch range computation ───────────────────────────────────────────────────

function fetchRange(view: View, base: string): { from: string; to: string } {
  if (view === "day") {
    return { from: base, to: addDays(base, 1) };
  }
  if (view === "week") {
    const mon = mondayOf(base);
    return { from: mon, to: addDays(mon, 7) };
  }
  // month — cover the full grid (including prev/next partial weeks)
  const [y, m] = base.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = addDays(addMonths(first, 1), -1);
  const gridStart = addDays(first, -dowMon(first));
  const lastDow = dowMon(last);
  const gridEnd = lastDow === 6 ? last : addDays(last, 6 - lastDow);
  return { from: gridStart, to: addDays(gridEnd, 1) };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TimeLabels() {
  return (
    <div className="w-14 shrink-0 border-r border-slate-100">
      {Array.from({ length: DAY_END - DAY_START }, (_, i) => {
        const h = DAY_START + i;
        const label = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true }).format(
          new Date(2000, 0, 1, h)
        );
        return (
          <div
            key={h}
            style={{ height: HOUR_PX }}
            className="flex items-start justify-end pr-2 pt-0.5"
          >
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GridLines() {
  return (
    <>
      {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-0 right-0 border-t border-slate-100"
          style={{ top: i * HOUR_PX }}
        />
      ))}
    </>
  );
}

function NowLine({ date }: { date: string }) {
  const [pos, setPos] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      if (toISTStr(now) !== date) { setPos(null); return; }
      const { h, min } = istHourMin(now);
      if (h >= DAY_START && h < DAY_END) {
        setPos((h * 60 + min - DAY_START * 60) * (HOUR_PX / 60));
      } else {
        setPos(null);
      }
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [date]);

  if (pos === null) return null;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: pos }}>
      <div className="relative flex items-center">
        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
        <div className="h-px flex-1 bg-rose-500" />
      </div>
    </div>
  );
}

function ApptBlock({ appt, narrow }: { appt: Appt; narrow?: boolean }) {
  const { h: sh, min: sm } = istHourMin(new Date(appt.startsAt));
  const { h: eh, min: em } = istHourMin(new Date(appt.endsAt));
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em || startMins + 30;
  const duration = endMins - startMins || 30;
  const top = (startMins - DAY_START * 60) * (HOUR_PX / 60);
  const height = Math.max(duration * (HOUR_PX / 60), 22);

  if (sh < DAY_START || sh >= DAY_END) return null;

  return (
    <Link
      href={`/provider/appointments/${appt.id}`}
      className={`absolute left-0.5 right-0.5 overflow-hidden rounded-lg border px-1.5 py-0.5 text-xs shadow-sm transition hover:shadow-md hover:brightness-95 ${blockColor(appt.status)}`}
      style={{ top, height }}
    >
      <div className="truncate font-semibold leading-tight">{appt.patientName}</div>
      {!narrow && height > 32 && (
        <div className="truncate opacity-70 leading-tight">{fmtTime(appt.startsAt)}</div>
      )}
    </Link>
  );
}

// ── Day View ───────────────────────────────────────────────────────────────────

function DayView({ date, appointments }: { date: string; appointments: Appt[] }) {
  const today = toISTStr(new Date());
  const isToday = date === today;
  const dayAppts = appointments.filter((a) => apptISTDate(a.startsAt) === date);

  return (
    <div className="p-4">
      <div className={`mb-3 text-center text-sm font-semibold ${isToday ? "text-[#2f6ea5]" : "text-slate-700"}`}>
        {fmtDayLabel(date)}
        {isToday && (
          <span className="ml-2 rounded-full bg-[#2f6ea5] px-2 py-0.5 text-xs text-white">Today</span>
        )}
      </div>
      <div className="flex overflow-y-auto rounded-xl border border-slate-100" style={{ maxHeight: 580 }}>
        <TimeLabels />
        <div className="relative flex-1" style={{ height: GRID_H }}>
          <GridLines />
          <NowLine date={date} />
          {dayAppts.map((a) => <ApptBlock key={a.id} appt={a} />)}
          {dayAppts.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No appointments scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────────

function WeekView({ weekStart, appointments }: { weekStart: string; appointments: Appt[] }) {
  const today = toISTStr(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto">
      {/* Header row */}
      <div className="flex border-b border-slate-200">
        <div className="w-14 shrink-0" />
        {days.map((d, i) => {
          const [, , day] = d.split("-").map(Number);
          const isToday = d === today;
          return (
            <div
              key={d}
              className={`flex-1 border-l border-slate-100 py-2 text-center ${isToday ? "bg-[#e7edf3]/50" : ""}`}
            >
              <div className="text-xs text-slate-500">{WEEK_LABELS[i]}</div>
              <div
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "bg-[#2f6ea5] text-white" : "text-slate-800"
                }`}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto rounded-b-3xl" style={{ maxHeight: 560 }}>
        <TimeLabels />
        {days.map((d) => {
          const dayAppts = appointments.filter((a) => apptISTDate(a.startsAt) === d);
          const isToday = d === today;
          return (
            <div
              key={d}
              className={`relative flex-1 border-l border-slate-100 ${isToday ? "bg-[#e7edf3]/20" : ""}`}
              style={{ height: GRID_H }}
            >
              <GridLines />
              <NowLine date={d} />
              {dayAppts.map((a) => <ApptBlock key={a.id} appt={a} narrow />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────────────────

function MonthView({ base, appointments }: { base: string; appointments: Appt[] }) {
  const today = toISTStr(new Date());
  const [y, m] = base.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = addDays(addMonths(first, 1), -1);
  const gridStart = addDays(first, -dowMon(first));
  const lastDow = dowMon(last);
  const gridEnd = lastDow === 6 ? last : addDays(last, 6 - lastDow);

  const cells: string[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) { cells.push(cur); cur = addDays(cur, 1); }

  const byDay: Record<string, Appt[]> = {};
  for (const a of appointments) {
    const key = apptISTDate(a.startsAt);
    (byDay[key] ??= []).push(a);
  }

  return (
    <div className="overflow-hidden rounded-3xl">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEK_LABELS.map((l) => (
          <div key={l} className="py-2 text-center text-xs font-semibold text-slate-500">{l}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {cells.map((d) => {
          const [, dm, dd] = d.split("-").map(Number);
          const inMonth = dm === m;
          const isToday = d === today;
          const dayAppts = byDay[d] ?? [];
          return (
            <div
              key={d}
              className={`min-h-[108px] p-1.5 ${inMonth ? "bg-white" : "bg-slate-50/70"}`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday
                    ? "bg-[#2f6ea5] text-white"
                    : inMonth
                    ? "text-slate-800"
                    : "text-slate-400"
                }`}
              >
                {dd}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    href={`/provider/appointments/${a.id}`}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate hover:opacity-80 ${blockColor(a.status)}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor(a.status)}`} />
                    <span className="truncate">{fmtTime(a.startsAt)} · {a.patientName}</span>
                  </Link>
                ))}
                {dayAppts.length > 3 && (
                  <div className="px-1 text-xs text-slate-400">+{dayAppts.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarClient() {
  const [view, setView] = useState<View>("week");
  const [base, setBase] = useState<string>(toISTStr(new Date()));
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (v: View, b: string) => {
    setLoading(true);
    try {
      const { from, to } = fetchRange(v, b);
      const fromUTC = istMidnightUTC(from).toISOString();
      const toUTC   = istMidnightUTC(to).toISOString();
      const res = await fetch(
        `/api/provider/calendar?from=${encodeURIComponent(fromUTC)}&to=${encodeURIComponent(toUTC)}`
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(view, base); }, [view, base, load]);

  function navigate(dir: -1 | 1) {
    setBase((b) => {
      if (view === "day")   return addDays(b, dir);
      if (view === "week")  return addDays(b, dir * 7);
      return addMonths(b, dir); // month
    });
  }

  function headerLabel() {
    if (view === "day") return fmtDayLabel(base);
    if (view === "week") {
      const mon = mondayOf(base);
      const sun = addDays(mon, 6);
      return `${fmtDayLabel(mon, true)} – ${fmtDayLabel(sun, true)}`;
    }
    return fmtMonthYear(base);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-[32px] border border-white/70 bg-white/90 px-6 py-4 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              aria-label="Previous"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            <h2 className="min-w-[220px] text-center text-sm font-semibold text-slate-900">
              {headerLabel()}
            </h2>

            <button
              onClick={() => navigate(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              aria-label="Next"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={() => setBase(toISTStr(new Date()))}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            >
              Today
            </button>

            {loading && (
              <span className="text-xs text-slate-400">Loading…</span>
            )}
          </div>

          {/* View switcher */}
          <div className="flex rounded-full border border-slate-200 p-0.5">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-1 text-xs font-semibold capitalize transition ${
                  view === v
                    ? "bg-[#2f6ea5] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar body */}
      <div className="rounded-3xl border border-white/70 bg-white/90 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        {view === "day" && <DayView date={base} appointments={appointments} />}
        {view === "week" && <WeekView weekStart={mondayOf(base)} appointments={appointments} />}
        {view === "month" && <MonthView base={base} appointments={appointments} />}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-slate-500">
        {[
          ["CONFIRMED",   "bg-emerald-500", "Confirmed"],
          ["PENDING",     "bg-amber-400",   "Pending"],
          ["NO_SHOW",     "bg-rose-400",    "No-show"],
          ["RESCHEDULED", "bg-purple-400",  "Rescheduled"],
          ["CANCELLED",   "bg-slate-400",   "Cancelled"],
        ].map(([, dot, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
