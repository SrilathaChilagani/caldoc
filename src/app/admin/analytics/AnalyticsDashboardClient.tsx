"use client";

import { useState, useEffect } from "react";

type Overview = {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRate: number;
  totalRevenuePaise: number;
  activePatients: number;
  newPatients: number;
  labOrders: number;
  rxOrders: number;
  avgRating: number | null;
  ratingCount: number;
};

type DayPoint = { day: string; count?: number; totalPaise?: number };
type VisitMode = { mode: string; count: number };
type TopProvider = { providerId: string; name: string; speciality: string; completedConsults: number };

type Analytics = {
  period: { days: number; from: string; to: string };
  overview: Overview;
  charts: {
    appointmentsByDay: DayPoint[];
    revenueByDay: DayPoint[];
    visitModes: VisitMode[];
  };
  topProviders: TopProvider[];
};

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function SparkBar({ values, color = "bg-[#2f6ea5]" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} opacity-80`}
          style={{ height: `${Math.max((v / max) * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsDashboardClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(d: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(days); }, [days]);

  const ov = data?.overview;
  const statCards = ov ? [
    { label: "Total bookings", value: ov.totalAppointments.toLocaleString("en-IN"), sub: `${days}d` },
    { label: "Completed", value: ov.completedAppointments.toLocaleString("en-IN"), sub: `${ov.completionRate}% rate` },
    { label: "Revenue", value: fmt(ov.totalRevenuePaise), sub: "collected" },
    { label: "Active patients", value: ov.activePatients.toLocaleString("en-IN"), sub: `${ov.newPatients} new` },
    { label: "Lab orders", value: ov.labOrders.toLocaleString("en-IN"), sub: "tests ordered" },
    { label: "Rx orders", value: ov.rxOrders.toLocaleString("en-IN"), sub: "medicine deliveries" },
    { label: "Avg rating", value: ov.avgRating ? `${ov.avgRating} ★` : "—", sub: `${ov.ratingCount} reviews` },
    { label: "Cancelled", value: ov.cancelledAppointments.toLocaleString("en-IN"), sub: "in period" },
  ] : [];

  const apptValues = data?.charts.appointmentsByDay.map((d) => d.count ?? 0) ?? [];
  const revValues = data?.charts.revenueByDay.map((d) => d.totalPaise ?? 0) ?? [];

  const PERIOD_OPTIONS = [
    { label: "7 days", value: 7 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
    { label: "1 year", value: 365 },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              days === opt.value
                ? "bg-[#2f6ea5] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bookings spark chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-3">Daily bookings</p>
              {apptValues.length > 0 ? (
                <SparkBar values={apptValues} />
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                {data.charts.appointmentsByDay[0]?.day} → {data.charts.appointmentsByDay[data.charts.appointmentsByDay.length - 1]?.day}
              </p>
            </div>

            {/* Revenue spark chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-3">Daily revenue</p>
              {revValues.length > 0 ? (
                <SparkBar values={revValues} color="bg-emerald-500" />
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
              {revValues.length > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  Peak: {fmt(Math.max(...revValues))} · Total: {fmt(revValues.reduce((a, b) => a + b, 0))}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Visit modes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-3">Consult modes</p>
              <div className="space-y-2">
                {data.charts.visitModes.map((m) => {
                  const total = data.charts.visitModes.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                  return (
                    <div key={m.mode} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{m.mode === "VIDEO" ? "Video" : m.mode === "AUDIO" ? "Audio" : m.mode ?? "Unknown"}</span>
                        <span className="text-slate-400">{m.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-[#2f6ea5]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top providers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-3">Top providers (completed consults)</p>
              {data.topProviders.length === 0 ? (
                <p className="text-sm text-slate-400">No completed consultations yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.topProviders.map((p, i) => (
                    <div key={p.providerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.speciality}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{p.completedConsults}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
