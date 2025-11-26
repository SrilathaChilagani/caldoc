"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";

type ProviderOption = {
  id: string;
  name: string;
  speciality: string;
  licenseNo: string | null;
};

type Props = {
  providers: ProviderOption[];
};

export default function SlotGeneratorForm({ providers }: Props) {
  const defaultId = providers[0]?.id || "";
  const [providerId, setProviderId] = useState(defaultId);
  const [customProviderId, setCustomProviderId] = useState("");
  const [date, setDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [intervalMins, setIntervalMins] = useState(30);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveProviderId = customProviderId.trim() || providerId;

  async function handleGenerate() {
    if (!effectiveProviderId) {
      setMsg("Please select or enter a provider.");
      return;
    }
    if (!date) {
      setMsg("Pick a date.");
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/provider/slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: effectiveProviderId,
          date,
          toDate: toDate || undefined,
          start,
          end,
          intervalMins,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate slots");
      }
      setMsg(`Generated or ensured ${data.count} slots for ${effectiveProviderId}`);
    } catch (err) {
      setMsg(getErrorMessage(err) || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Provider (from search)
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.speciality}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Or enter Provider ID manually
          <input
            value={customProviderId}
            onChange={(e) => setCustomProviderId(e.target.value)}
            placeholder="provider cuid / slug"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Date (YYYY-MM-DD)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          To date (optional)
          <input
            type="date"
            value={toDate}
            min={date || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Start time
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          End time
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Interval (minutes)
          <input
            type="number"
            value={intervalMins}
            min={5}
            onChange={(e) => setIntervalMins(parseInt(e.target.value || "30", 10))}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={busy}
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Generating..." : "Generate slots"}
      </button>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}
