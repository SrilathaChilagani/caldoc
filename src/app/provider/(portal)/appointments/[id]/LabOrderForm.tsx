"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

const TEST_OPTIONS = [
  "Complete blood count (CBC)",
  "Comprehensive metabolic panel (CMP)",
  "Lipid profile",
  "HbA1c",
  "Thyroid panel",
  "Vitamin D",
  "Urinalysis",
  "Liver function test",
  "Kidney function test",
];

type ExistingOrder = {
  id: string;
  status: string;
  tests: string[];
  createdAtLabel: string;
  deliveryMode?: string | null;
};

type Props = {
  appointmentId: string;
  existingOrders: ExistingOrder[];
};

export default function LabOrderForm({ appointmentId, existingOrders }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<"IN_HOUSE" | "EXTERNAL">("IN_HOUSE");
  const [selected, setSelected] = useState<string[]>([]);
  const [customTests, setCustomTests] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const existingLabel = useMemo(() => existingOrders, [existingOrders]);

  function toggleTest(value: string) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/provider/appointments/${appointmentId}/labs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMode: mode,
          tests: selected,
          customTests,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to save lab order");
      }
      setMessage("Lab order recorded");
      setSelected([]);
      setCustomTests("");
      setNotes("");
      startTransition(() => router.refresh());
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {existingLabel.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-emerald-900">Existing lab orders</p>
          <ul className="mt-2 space-y-2">
            {existingLabel.map((order) => (
              <li key={order.id} className="rounded-xl bg-white/70 p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{order.createdAtLabel}</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{order.tests.join(", ")}</p>
                {order.deliveryMode && (
                  <p className="text-xs text-slate-500">Mode: {order.deliveryMode === "IN_HOUSE" ? "CalDoc labs" : "External"}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fulfillment</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="deliveryMode"
                value="IN_HOUSE"
                checked={mode === "IN_HOUSE"}
                onChange={() => setMode("IN_HOUSE")}
              />
              CalDoc labs team
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="deliveryMode"
                value="EXTERNAL"
                checked={mode === "EXTERNAL"}
                onChange={() => setMode("EXTERNAL")}
              />
              Patient will arrange externally
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select tests</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TEST_OPTIONS.map((label) => (
              <label key={label} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  value={label}
                  checked={selected.includes(label)}
                  onChange={() => toggleTest(label)}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Need something else? Use the custom field below.</p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Additional tests (comma separated)
          <input
            type="text"
            value={customTests}
            onChange={(e) => setCustomTests(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
            placeholder="e.g., Ferritin, CRP"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Notes for labs team (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
            placeholder="Fasting required, collect samples at patient's home, etc."
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save lab order"}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
      </form>
    </div>
  );
}
