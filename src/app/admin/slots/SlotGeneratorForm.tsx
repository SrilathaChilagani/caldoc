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
  preselectedId?: string;
};

export default function SlotGeneratorForm({ providers, preselectedId }: Props) {
  const defaultId = preselectedId || providers[0]?.id || "";
  const [providerId, setProviderId] = useState(defaultId);
  const [customProviderId, setCustomProviderId] = useState("");
  const [date, setDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [intervalMins, setIntervalMins] = useState(30);
  const [feeRupees, setFeeRupees] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveProviderId = customProviderId.trim() || providerId;

  async function handleGenerate() {
    if (!effectiveProviderId) {
      setMsg("Please select or enter a provider.");
      return;
    }
    if (!date) {
      setMsg("Pick a start date.");
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const feePaise = feeRupees ? Math.round(parseFloat(feeRupees) * 100) : undefined;
      const res = await fetch("/api/provider/slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          providerId: effectiveProviderId,
          date,
          toDate: toDate || undefined,
          start,
          end,
          intervalMins,
          feePaise: feePaise && feePaise > 0 ? feePaise : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate slots");
      }
      setMsg(`Created/ensured ${data.count} slots`);
    } catch (err) {
      setMsg(getErrorMessage(err) || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Provider (from search)
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          >
            <option value="">— Select —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.speciality}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Or enter Provider ID manually
          <input
            value={customProviderId}
            onChange={(e) => setCustomProviderId(e.target.value)}
            placeholder="provider cuid / slug"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Start date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          End date (optional)
          <input
            type="date"
            value={toDate}
            min={date || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Start time
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          End time
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Interval (minutes)
          <input
            type="number"
            value={intervalMins}
            min={5}
            onChange={(e) => setIntervalMins(parseInt(e.target.value || "30", 10))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
        </label>
      </div>

      <label className="text-sm font-medium text-slate-700">
        Consultation fee ₹ (optional — leave blank to use provider default)
        <input
          type="number"
          step="0.01"
          value={feeRupees}
          onChange={(e) => setFeeRupees(e.target.value)}
          placeholder="e.g. 599"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
        />
      </label>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={busy || !effectiveProviderId}
        className="rounded-full bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
      >
        {busy ? "Generating…" : "Generate slots"}
      </button>

      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {msg}
        </div>
      )}
    </div>
  );
}
