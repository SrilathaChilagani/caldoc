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
        const res = await fetch("/api/provider/self", { cache: "no-store" });
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

  async function handleGenerate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/provider/slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          date,
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
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <Link
        href="/provider/appointments"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to appointments
      </Link>
      <h1 className="text-2xl font-semibold">Provider · Schedule</h1>

      <div className="rounded-xl border bg-white text-black p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3">
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
                className="w-max rounded border px-2 py-1 text-xs hover:bg-gray-50"
              >
                Use a different ID
              </button>
            </>
          ) : (
            <label className="text-sm">
              Provider ID
              <input
                className="mt-1 w-full rounded border p-2"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="paste a provider.id"
              />
            </label>
          )}

          <label className="text-sm">
            Date (YYYY-MM-DD)
            <input
              className="mt-1 w-full rounded border p-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="2025-11-08"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Start (HH:MM)
              <input
                className="mt-1 w-full rounded border p-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End (HH:MM)
              <input
                className="mt-1 w-full rounded border p-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm">
            Interval (mins)
            <input
              type="number"
              className="mt-1 w-full rounded border p-2"
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
              className="mt-1 w-full rounded border p-2"
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
            className="rounded bg-teal-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {busy ? "Generating..." : "Generate slots"}
          </button>

          {msg && <div className="text-sm text-gray-700">{msg}</div>}
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
