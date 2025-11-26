"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

type DrugCategory = "OTC" | "LIST_O" | "LIST_A" | "LIST_B" | "SCHEDULE_X";

type Medicine = {
  name: string;
  sig?: string;
  qty?: string;
  category: DrugCategory;
};

const CATEGORY_OPTIONS: { value: DrugCategory; label: string }[] = [
  { value: "OTC", label: "OTC (general)" },
  { value: "LIST_O", label: "List O" },
  { value: "LIST_A", label: "List A" },
  { value: "LIST_B", label: "List B" },
  { value: "SCHEDULE_X", label: "Schedule X" },
];

type Props = {
  appointmentId: string;
  initialMeds: Medicine[];
};

function normalizeInitialMeds(initial: Medicine[]): Medicine[] {
  if (!initial.length) {
    return [{ name: "", sig: "", qty: "", category: "OTC" }];
  }
  return initial.map((med) => ({
    name: med.name,
    sig: med.sig,
    qty: med.qty,
    category: med.category ?? "OTC",
  }));
}

export default function PrescriptionForm({ appointmentId, initialMeds }: Props) {
  const router = useRouter();
  const [meds, setMeds] = useState<Medicine[]>(normalizeInitialMeds(initialMeds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateMed(index: number, field: keyof Medicine, value: string) {
    setMeds((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  }

  function addRow() {
    setMeds((prev) => [...prev, { name: "", sig: "", qty: "", category: "OTC" }]);
  }

  function removeRow(index: number) {
    setMeds((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = meds
        .filter((m) => m.name.trim().length > 0)
        .map((m) => ({
          ...m,
          category: m.category ?? "OTC",
        }));
      if (payload.length === 0) {
        throw new Error("Add at least one medicine");
      }
      const res = await fetch(`/api/provider/appointments/${appointmentId}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meds: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to save prescription");
      }
      setMessage("Prescription saved");
      router.refresh();
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {meds.map((med, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex-1 text-sm font-medium text-slate-700">
              Medicine name
              <input
                type="text"
                value={med.name}
                onChange={(e) => updateMed(idx, "name", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Azithromycin 500mg"
                required={idx === 0}
              />
            </label>
            <label className="flex-1 text-sm font-medium text-slate-700">
              Sig / instructions
              <input
                type="text"
                value={med.sig || ""}
                onChange={(e) => updateMed(idx, "sig", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="1 tablet twice a day"
              />
            </label>
            <label className="w-28 text-sm font-medium text-slate-700">
              Qty
              <input
                type="text"
                value={med.qty || ""}
                onChange={(e) => updateMed(idx, "qty", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="10"
              />
            </label>
            <label className="w-40 text-sm font-medium text-slate-700">
              Category
              <select
                value={med.category}
                onChange={(e) => updateMed(idx, "category", e.target.value as DrugCategory)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {meds.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-dashed border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:border-slate-400"
        >
          + Add medicine
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & generate PDF"}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </form>
  );
}
