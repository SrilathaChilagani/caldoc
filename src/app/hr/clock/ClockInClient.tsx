"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EmpRow = {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  today: {
    clockIn: string | null;
    clockOut: string | null;
    status: string;
    workMinutes: number | null;
  } | null;
};

function fmtTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ClockInClient({ employees }: { employees: EmpRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const filtered = employees.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(q.toLowerCase())
  );

  async function clock(employeeId: string, action: "CLOCK_IN" | "CLOCK_OUT") {
    setLoading(employeeId);
    setMessage(null);
    try {
      const res = await fetch("/api/hr/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, action }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage({ id: employeeId, text: j.error ?? "Error", ok: false });
      } else {
        const t = action === "CLOCK_IN"
          ? `Clocked in at ${fmtTime(j.clockIn)}`
          : `Clocked out at ${fmtTime(j.clockOut)} · ${Math.floor((j.workMinutes ?? 0) / 60)}h ${(j.workMinutes ?? 0) % 60}m`;
        setMessage({ id: employeeId, text: t, ok: true });
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by name or employee code…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        autoFocus
      />

      <div className="space-y-3">
        {filtered.map((e) => {
          const clockedIn = !!e.today?.clockIn;
          const clockedOut = !!e.today?.clockOut;
          const msg = message?.id === e.id ? message : null;

          return (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.employeeCode} · {e.department}</p>
                  {clockedIn && (
                    <p className="mt-1 text-xs text-slate-400">
                      In: {fmtTime(e.today!.clockIn)}
                      {clockedOut && ` · Out: ${fmtTime(e.today!.clockOut)}`}
                      {e.today?.workMinutes ? ` · ${Math.floor(e.today.workMinutes / 60)}h ${e.today.workMinutes % 60}m` : ""}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {!clockedIn && (
                    <button
                      onClick={() => clock(e.id, "CLOCK_IN")}
                      disabled={loading === e.id}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Clock in
                    </button>
                  )}
                  {clockedIn && !clockedOut && (
                    <button
                      onClick={() => clock(e.id, "CLOCK_OUT")}
                      disabled={loading === e.id}
                      className="rounded-xl bg-[#2f6ea5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
                    >
                      Clock out
                    </button>
                  )}
                  {clockedOut && (
                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
                      Done for today
                    </span>
                  )}
                </div>
              </div>

              {msg && (
                <p className={`mt-2 text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>
                  {msg.text}
                </p>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center py-10 text-sm text-slate-400">No employees found.</p>
        )}
      </div>
    </div>
  );
}
