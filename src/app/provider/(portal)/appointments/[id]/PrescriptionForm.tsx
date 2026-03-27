"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import {
  defaultMedicineRow,
  normalizeDrugCategory,
  type DrugCategory,
  type Medicine,
} from "@/lib/medication";

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

type MedicationSuggestion = {
  id: string;
  name: string;
  generic?: string | null;
  form?: string | null;
  strength?: string | null;
  category?: string | null;
};

function normalizeInitialMeds(initial: Medicine[]): Medicine[] {
  if (!initial.length) {
    return [defaultMedicineRow()];
  }
  return initial.map((med) => ({
    name: med.name,
    sig: med.sig,
    qty: med.qty,
    category: normalizeDrugCategory(med.category),
  }));
}

export default function PrescriptionForm({ appointmentId, initialMeds }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [meds, setMeds] = useState<Medicine[]>(normalizeInitialMeds(initialMeds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [medSuggestions, setMedSuggestions] = useState<Record<number, MedicationSuggestion[]>>({});
  const [openSuggestions, setOpenSuggestions] = useState<Record<number, boolean>>({});
  const [highlighted, setHighlighted] = useState<Record<number, number>>({});
  const controllersRef = useRef<Record<number, AbortController | null>>({});

  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach((controller) => controller?.abort());
    };
  }, []);

  function updateMed(index: number, field: keyof Medicine, value: string | DrugCategory) {
    setMeds((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  }

  function addRow() {
    setMeds((prev) => [...prev, defaultMedicineRow()]);
  }

  function removeRow(index: number) {
    setMeds((prev) => prev.filter((_, idx) => idx !== index));
  }

  function requestSuggestions(index: number, value: string) {
    const term = value.trim();
    if (term.length < 2) {
      setMedSuggestions((prev) => {
        if (!prev[index]) return prev;
        const clone = { ...prev };
        delete clone[index];
        return clone;
      });
      setOpenSuggestions((prev) => {
        if (!prev[index]) return prev;
        const clone = { ...prev };
        delete clone[index];
        return clone;
      });
      setHighlighted((prev) => {
        if (prev[index] === undefined) return prev;
        const clone = { ...prev };
        delete clone[index];
        return clone;
      });
      controllersRef.current[index]?.abort();
      controllersRef.current[index] = null;
      return;
    }
    const controller = new AbortController();
    controllersRef.current[index]?.abort();
    controllersRef.current[index] = controller;
    fetch(`/api/provider/medications?q=${encodeURIComponent(term)}`, {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || controller.signal.aborted) return;
        const meds: MedicationSuggestion[] = Array.isArray(data.medications) ? data.medications : [];
        setMedSuggestions((prev) => ({ ...prev, [index]: meds }));
        setOpenSuggestions((prev) => ({ ...prev, [index]: meds.length > 0 }));
        setHighlighted((prev) => ({ ...prev, [index]: meds.length > 0 ? 0 : -1 }));
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
      });
  }

  function handleNameInput(index: number, value: string) {
    updateMed(index, "name", value);
    requestSuggestions(index, value);
  }

  function applySuggestion(index: number, suggestion: MedicationSuggestion) {
    updateMed(index, "name", suggestion.name);
    updateMed(index, "category", normalizeDrugCategory(suggestion.category));
    setOpenSuggestions((prev) => ({ ...prev, [index]: false }));
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    const list = medSuggestions[index] || [];
    if (!list.length) return;
    const current = highlighted[index] ?? -1;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = current + 1 >= list.length ? 0 : current + 1;
      setHighlighted((prev) => ({ ...prev, [index]: next }));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = current - 1 < 0 ? list.length - 1 : current - 1;
      setHighlighted((prev) => ({ ...prev, [index]: next }));
      return;
    }
    if (event.key === "Enter") {
      if (current >= 0 && list[current]) {
        event.preventDefault();
        applySuggestion(index, list[current]);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpenSuggestions((prev) => ({ ...prev, [index]: false }));
    }
  }

  function handleBlur(index: number) {
    setTimeout(() => {
      setOpenSuggestions((prev) => ({ ...prev, [index]: false }));
    }, 150);
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
      startTransition(() => router.refresh());
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
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => handleNameInput(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onFocus={() => {
                      if ((medSuggestions[idx] || []).length > 0) {
                        setOpenSuggestions((prev) => ({ ...prev, [idx]: true }));
                      }
                    }}
                    onBlur={() => handleBlur(idx)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Azithromycin 500mg"
                    required={idx === 0}
                  />
                  {openSuggestions[idx] && (medSuggestions[idx]?.length ?? 0) > 0 && (
                    <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                      {(medSuggestions[idx] || []).map((option, optionIdx) => {
                        const active = highlighted[idx] === optionIdx;
                        return (
                          <button
                            type="button"
                            key={option.id}
                            className={`flex w-full flex-col items-start px-4 py-2 text-left text-sm ${
                              active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applySuggestion(idx, option);
                            }}
                            onMouseEnter={() => setHighlighted((prev) => ({ ...prev, [idx]: optionIdx }))}
                          >
                            <span className="font-medium">{option.name}</span>
                            {(option.generic || option.strength || option.form) && (
                              <span className="text-xs text-slate-500">
                                {[option.generic, option.strength, option.form].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
