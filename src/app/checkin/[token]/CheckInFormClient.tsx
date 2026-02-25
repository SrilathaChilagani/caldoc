"use client";

import { useState } from "react";

// ─── Form shape ───────────────────────────────────────────────────────────────

export type CheckInData = {
  // Section 1 — Reason for visit
  chiefComplaint: string;
  symptomDuration: string;

  // Section 2 — Medical history (conditions)
  conditions: string[];
  conditionsOther: string;

  // Section 3 — Current medications
  currentMedications: string;
  noMedications: boolean;

  // Section 4 — Allergies
  drugAllergies: string[];
  drugAllergiesOther: string;
  foodAllergies: string;
  environmentalAllergies: string;
  noKnownAllergies: boolean;

  // Section 5 — Social history
  smokingStatus: "never" | "former" | "current" | "";
  alcoholUse: "none" | "occasional" | "regular" | "";

  // Section 6 — Current symptoms
  currentSymptoms: string[];

  // Section 7 — Vitals (optional, patient-reported)
  bpSystolic: string;
  bpDiastolic: string;
  heartRate: string;
  temperature: string;
  weight: string;
  spo2: string;

  // Section 8 — Additional info
  additionalInfo: string;
};

const EMPTY_FORM: CheckInData = {
  chiefComplaint: "",
  symptomDuration: "",
  conditions: [],
  conditionsOther: "",
  currentMedications: "",
  noMedications: false,
  drugAllergies: [],
  drugAllergiesOther: "",
  foodAllergies: "",
  environmentalAllergies: "",
  noKnownAllergies: false,
  smokingStatus: "",
  alcoholUse: "",
  currentSymptoms: [],
  bpSystolic: "",
  bpDiastolic: "",
  heartRate: "",
  temperature: "",
  weight: "",
  spo2: "",
  additionalInfo: "",
};

// ─── Options ─────────────────────────────────────────────────────────────────

const KNOWN_CONDITIONS = [
  "Hypertension / High Blood Pressure",
  "Type 2 Diabetes",
  "Type 1 Diabetes",
  "Heart Disease / Coronary Artery Disease",
  "Asthma",
  "COPD / Chronic Bronchitis",
  "Thyroid Disorder (Hypo/Hyper)",
  "Chronic Kidney Disease",
  "Liver Disease",
  "Rheumatoid / Osteoarthritis",
  "Depression / Anxiety",
  "Epilepsy / Seizures",
  "Stroke",
  "Cancer (active or history)",
  "HIV / Immune disorder",
  "Sleep Apnoea",
];

const DRUG_ALLERGIES = [
  "Penicillin / Amoxicillin",
  "Sulfonamides (Sulfa drugs)",
  "NSAIDs (Aspirin, Ibuprofen)",
  "Codeine / Opioids",
  "Cephalosporins",
  "Metronidazole",
  "Ciprofloxacin / Fluoroquinolones",
];

const CURRENT_SYMPTOMS = [
  "Fever",
  "Cough",
  "Cold / Runny nose",
  "Sore throat",
  "Shortness of breath",
  "Chest pain / tightness",
  "Palpitations",
  "Headache",
  "Dizziness / Vertigo",
  "Nausea / Vomiting",
  "Abdominal pain",
  "Diarrhoea",
  "Constipation",
  "Joint pain",
  "Back pain",
  "Skin rash",
  "Fatigue / Weakness",
  "Swelling (oedema)",
  "Frequent urination",
  "Blurred vision",
  "Ear pain / discharge",
  "Eye redness / discharge",
];

const DURATION_OPTIONS = [
  "Today / Less than 24 hrs",
  "2–3 days",
  "4–7 days",
  "1–2 weeks",
  "2–4 weeks",
  "1–3 months",
  "More than 3 months",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ num, title, sub }: { num: number; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2f6ea5] text-xs font-bold text-white">
        {num}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function CheckboxGrid({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
            selected.includes(opt)
              ? "border-[#2f6ea5] bg-[#2f6ea5]/5 font-medium text-slate-900"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onChange(toggle(selected, opt))}
            className="accent-[#2f6ea5]"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

const cardCls =
  "rounded-2xl border border-white/30 bg-white/80 backdrop-blur-sm p-6 shadow-[0_4px_24px_rgba(47,110,165,0.07)]";

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

const labelCls = "block text-xs font-medium text-slate-600";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckInFormClient({
  appointmentId,
  token,
  previewMode = false,
}: {
  appointmentId: string;
  token: string;
  previewMode?: boolean;
}) {
  const [form, setForm] = useState<CheckInData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CheckInData>(key: K, value: CheckInData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.chiefComplaint.trim()) {
      setError("Please describe your main reason for the visit.");
      return;
    }
    if (previewMode) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/checkin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={`${cardCls} text-center`}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Check-in complete!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your pre-visit information has been saved and shared with your doctor. See you at your
          appointment!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Section 1: Reason for visit ── */}
      <div className={cardCls}>
        <SectionHeader
          num={1}
          title="Reason for visit"
          sub="Tell your doctor what's bringing you in today."
        />
        <label className={labelCls}>
          Main complaint / reason for visit *
          <textarea
            rows={3}
            value={form.chiefComplaint}
            onChange={(e) => set("chiefComplaint", e.target.value)}
            placeholder="e.g. Persistent cough and mild fever for the past 3 days"
            className={inputCls}
            required
          />
        </label>
        <div className="mt-3">
          <p className={`${labelCls} mb-1`}>How long have you had these symptoms?</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((d) => (
              <label
                key={d}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  form.symptomDuration === d
                    ? "border-[#2f6ea5] bg-[#2f6ea5]/5 font-semibold text-[#2f6ea5]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="symptomDuration"
                  value={d}
                  checked={form.symptomDuration === d}
                  onChange={() => set("symptomDuration", d)}
                  className="sr-only"
                />
                {d}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 2: Current symptoms ── */}
      <div className={cardCls}>
        <SectionHeader
          num={2}
          title="Current symptoms"
          sub="Check all that apply to you right now."
        />
        <CheckboxGrid
          options={CURRENT_SYMPTOMS}
          selected={form.currentSymptoms}
          onChange={(v) => set("currentSymptoms", v)}
        />
      </div>

      {/* ── Section 3: Medical history ── */}
      <div className={cardCls}>
        <SectionHeader
          num={3}
          title="Medical history"
          sub="Check any conditions you've been diagnosed with."
        />
        <CheckboxGrid
          options={KNOWN_CONDITIONS}
          selected={form.conditions}
          onChange={(v) => set("conditions", v)}
        />
        <label className={`${labelCls} mt-3 block`}>
          Other conditions not listed above
          <input
            type="text"
            value={form.conditionsOther}
            onChange={(e) => set("conditionsOther", e.target.value)}
            placeholder="e.g. Psoriasis, Gout"
            className={inputCls}
          />
        </label>
      </div>

      {/* ── Section 4: Current medications ── */}
      <div className={cardCls}>
        <SectionHeader
          num={4}
          title="Current medications"
          sub="List all medicines, vitamins, and supplements you take regularly."
        />
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.noMedications}
            onChange={(e) => set("noMedications", e.target.checked)}
            className="accent-[#2f6ea5]"
          />
          I am not taking any medications
        </label>
        {!form.noMedications && (
          <textarea
            rows={4}
            value={form.currentMedications}
            onChange={(e) => set("currentMedications", e.target.value)}
            placeholder={"e.g.\nMetformin 500 mg — twice daily\nAmlodipine 5 mg — once daily\nVitamin D3 60,000 IU — weekly"}
            className={inputCls}
          />
        )}
      </div>

      {/* ── Section 5: Allergies ── */}
      <div className={cardCls}>
        <SectionHeader
          num={5}
          title="Allergies"
          sub="Check any known drug allergies."
        />
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.noKnownAllergies}
            onChange={(e) => {
              set("noKnownAllergies", e.target.checked);
              if (e.target.checked) {
                set("drugAllergies", []);
                set("drugAllergiesOther", "");
                set("foodAllergies", "");
                set("environmentalAllergies", "");
              }
            }}
            className="accent-[#2f6ea5]"
          />
          No known drug allergies (NKDA)
        </label>
        {!form.noKnownAllergies && (
          <>
            <CheckboxGrid
              options={DRUG_ALLERGIES}
              selected={form.drugAllergies}
              onChange={(v) => set("drugAllergies", v)}
            />
            <label className={`${labelCls} mt-3 block`}>
              Other drug allergies
              <input
                type="text"
                value={form.drugAllergiesOther}
                onChange={(e) => set("drugAllergiesOther", e.target.value)}
                placeholder="e.g. Tetracycline, Contrast dye"
                className={inputCls}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Food allergies
                <input
                  type="text"
                  value={form.foodAllergies}
                  onChange={(e) => set("foodAllergies", e.target.value)}
                  placeholder="e.g. Peanuts, Shellfish"
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Environmental allergies
                <input
                  type="text"
                  value={form.environmentalAllergies}
                  onChange={(e) => set("environmentalAllergies", e.target.value)}
                  placeholder="e.g. Dust, Pollen, Pet dander"
                  className={inputCls}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* ── Section 6: Social history ── */}
      <div className={cardCls}>
        <SectionHeader num={6} title="Lifestyle" sub="This helps your doctor understand risk factors." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className={`${labelCls} mb-2`}>Smoking status</p>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { value: "never", label: "Never smoked" },
                  { value: "former", label: "Former smoker" },
                  { value: "current", label: "Current smoker" },
                ] as const
              ).map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="smokingStatus"
                    value={value}
                    checked={form.smokingStatus === value}
                    onChange={() => set("smokingStatus", value)}
                    className="accent-[#2f6ea5]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className={`${labelCls} mb-2`}>Alcohol use</p>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { value: "none", label: "None" },
                  { value: "occasional", label: "Occasional (1–2 drinks/week)" },
                  { value: "regular", label: "Regular (3+ drinks/week)" },
                ] as const
              ).map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="alcoholUse"
                    value={value}
                    checked={form.alcoholUse === value}
                    onChange={() => set("alcoholUse", value)}
                    className="accent-[#2f6ea5]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 7: Vitals (optional) ── */}
      <div className={cardCls}>
        <SectionHeader
          num={7}
          title="Vitals (optional)"
          sub="If you have a home monitor, these readings help your doctor assess you better."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className={`${labelCls} mb-1`}>Blood pressure (mmHg)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={50}
                max={250}
                value={form.bpSystolic}
                onChange={(e) => set("bpSystolic", e.target.value)}
                placeholder="Sys"
                className="mt-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30"
              />
              <span className="shrink-0 text-slate-400">/</span>
              <input
                type="number"
                min={30}
                max={150}
                value={form.bpDiastolic}
                onChange={(e) => set("bpDiastolic", e.target.value)}
                placeholder="Dia"
                className="mt-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30"
              />
            </div>
          </div>
          <label className={labelCls}>
            Heart rate (bpm)
            <input
              type="number"
              min={30}
              max={220}
              value={form.heartRate}
              onChange={(e) => set("heartRate", e.target.value)}
              placeholder="e.g. 76"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            Temperature (°F or °C)
            <input
              type="text"
              value={form.temperature}
              onChange={(e) => set("temperature", e.target.value)}
              placeholder="e.g. 98.6 °F"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            Weight (kg)
            <input
              type="number"
              min={1}
              max={500}
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              placeholder="e.g. 72"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            SpO₂ / Oxygen saturation (%)
            <input
              type="number"
              min={50}
              max={100}
              value={form.spo2}
              onChange={(e) => set("spo2", e.target.value)}
              placeholder="e.g. 98"
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* ── Section 8: Anything else ── */}
      <div className={cardCls}>
        <SectionHeader
          num={8}
          title="Anything else?"
          sub="Share any other concerns, recent test results, or information that might help your doctor."
        />
        <textarea
          rows={4}
          value={form.additionalInfo}
          onChange={(e) => set("additionalInfo", e.target.value)}
          placeholder="e.g. Had a blood test last month — HbA1c was 7.2%. Also experiencing mild ankle swelling since last week."
          className={inputCls}
        />
      </div>

      {/* ── Error & Submit ── */}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/80 px-6 py-4 backdrop-blur-sm shadow-[0_4px_24px_rgba(47,110,165,0.07)]">
        <p className="text-xs text-slate-500">
          Your information is private and only visible to your doctor.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#255b8b] disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit check-in"}
        </button>
      </div>
    </form>
  );
}
