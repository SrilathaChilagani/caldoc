// src/app/provider/schedule/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProviderSchedule() {
  const [providerId, setProviderId] = useState("");
  const [providerName, setProviderName] = useState<string | null>(null); // NEW: display name when available
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [intervalMins, setIntervalMins] = useState(30);
  const [feeRupees, setFeeRupees] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 🔹 Try to auto-populate providerId + providerName when this page is used
  // from the provider portal. If the API isn't present or user isn't signed in,
  // we silently skip and keep your current manual flow.
  useEffect(() => {
    let stopped = false;

    async function loadSelf() {
      try {
        const res = await fetch("/api/provider/self", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return; // no session or route missing — keep manual input
        const data = await res.json();
        if (!stopped && data?.id) {
          setProviderId((prev) => prev || data.id);
          setProviderName(data.name || null);
        }
      } catch {
        // ignore — keep manual input
      }
    }

    loadSelf();
    return () => {
      stopped = true;
    };
  }, []);

  const [toDate, setToDate] = useState("");

  async function handleGenerate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/provider/slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          providerId,
          date,
          toDate: toDate || undefined,
          start,
          end,
          intervalMins,
          feePaise: normalizeFeeInput(feeRupees),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(`Created/ensured ${data.count} slots`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      setMsg(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <Link
        href="/provider/appointments"
        className="inline-flex items-center text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
      >
        ← Back to appointments
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-slate-900">Schedule builder</h1>

      <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="grid grid-cols-1 gap-4">
          {/* NEW: when we know the signed-in provider, show name & hide editable ID */}
          {providerName && providerId ? (
            <>
              <div className="text-sm">
                <span className="font-medium">Provider</span>: {providerName}
              </div>
              {/* Keep providerId flowing exactly as before (state still used in fetch body) */}
              {/* Optional: allow switching to a different ID */}
              <button
                type="button"
                onClick={() => setProviderName(null)} // reveals the manual Provider ID input
                className="w-max rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Use a different ID
              </button>
            </>
          ) : (
            <label className="text-sm">
              Provider ID
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="paste a provider.id"
              />
            </label>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Start date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                value={toDate}
                min={date || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Start time
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End time
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm">
            Interval (mins)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
              value={intervalMins}
              onChange={(e) =>
                setIntervalMins(parseInt(e.target.value || "30", 10))
              }
            />
          </label>

          <label className="text-sm">
            Consultation fee (₹, optional)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
              value={feeRupees}
              onChange={(e) => setFeeRupees(e.target.value)}
              placeholder="Example: 599"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Leave blank to reuse your default provider fee.
            </span>
          </label>

          <button
            onClick={handleGenerate}
            disabled={busy || !providerId}
            className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
          >
            {busy ? "Generating..." : "Generate slots"}
          </button>

          {msg && <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{msg}</div>}
        </div>
      </div>
    </main>
  );
}

function normalizeFeeInput(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed * 100);
}
