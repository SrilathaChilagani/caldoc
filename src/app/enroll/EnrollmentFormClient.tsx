"use client";

import { useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUALIFICATIONS = [
  "MBBS", "MD", "MS", "DNB", "DM", "MCh", "BHMS", "BAMS", "BDS", "MDS",
  "DNBE", "FRCS", "MRCP", "Fellowship", "Other",
];

const SPECIALITIES = [
  "General Medicine", "General Surgery", "Pediatrics", "Gynecology & Obstetrics",
  "Cardiology", "Dermatology", "Orthopedics", "Neurology", "Psychiatry",
  "ENT (Ear Nose Throat)", "Ophthalmology", "Urology", "Nephrology",
  "Gastroenterology", "Endocrinology", "Pulmonology / Chest Medicine",
  "Oncology", "Radiology", "Anesthesiology", "Emergency Medicine",
  "Family Medicine", "Geriatrics", "Diabetology", "Rheumatology",
  "Hematology", "Infectious Disease", "Physical Medicine & Rehab",
  "Ayurveda", "Homeopathy", "Dental", "Other",
];

const COUNCILS = [
  "Medical Council of India (MCI) / NMC",
  "Delhi Medical Council",
  "Maharashtra Medical Council",
  "Karnataka Medical Council",
  "Tamil Nadu Medical Council",
  "Telangana State Medical Council",
  "Andhra Pradesh Medical Council",
  "Kerala State Medical Council",
  "West Bengal Medical Council",
  "Gujarat Medical Council",
  "Rajasthan Medical Council",
  "Uttar Pradesh Medical Council",
  "Punjab Medical Council",
  "Haryana Medical Council",
  "Other State Medical Council",
  "Dental Council of India",
  "Central Council of Homoeopathy",
  "Central Council of Indian Medicine",
];

const LANGUAGES = [
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu",
  "Gujarati", "Kannada", "Malayalam", "Odia", "Punjabi", "Assamese",
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli",
  "Daman and Diu", "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardCls =
  "rounded-2xl border border-white/30 bg-white/80 backdrop-blur-sm p-6 shadow-[0_4px_24px_rgba(47,110,165,0.07)]";
const inputCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";
const labelCls = "block text-xs font-medium text-slate-600";
const selectCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

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

function CheckboxList({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(val: string) {
    onChange(
      selected.includes(val) ? selected.filter((x) => x !== val) : [...selected, val]
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
            selected.includes(opt)
              ? "border-[#2f6ea5] bg-[#2f6ea5]/5 font-semibold text-[#2f6ea5]"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="sr-only"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EnrollmentFormClient() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled fields
  const [languages, setLanguages] = useState<string[]>([]);
  const [visitModes, setVisitModes] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("You must agree to the MoHFW Telemedicine Practice Guidelines to proceed.");
      return;
    }
    if (languages.length === 0) {
      setError("Please select at least one language.");
      return;
    }
    if (visitModes.length === 0) {
      setError("Please select at least one consultation mode.");
      return;
    }

    const form = formRef.current!;
    const data = new FormData(form);

    // Append checkbox arrays (not in FormData by default)
    languages.forEach((l) => data.append("languages[]", l));
    visitModes.forEach((m) => data.append("visitModes[]", m));
    data.set("consentTelemedicine", "true");

    setSubmitting(true);
    try {
      const res = await fetch("/api/enroll", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Submission failed.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={`${cardCls} text-center py-12`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Application Submitted!</h2>
        <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
          Thank you for enrolling with CalDoc. We are currently reviewing your submission and
          will be in touch soon — typically within 2–3 business days.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          You will receive a WhatsApp message and email once your application is approved,
          with your login credentials and next steps.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

      {/* ── Section 1: Personal Information ── */}
      <div className={cardCls}>
        <SectionHeader num={1} title="Personal Information" sub="As per your medical registration." />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`${labelCls} sm:col-span-2`}>
            Full name (as per registration) *
            <input name="fullName" required className={inputCls} placeholder="Dr. Priya Sharma" />
          </label>
          <label className={labelCls}>
            Date of birth
            <input name="dob" type="date" className={inputCls} />
          </label>
          <label className={labelCls}>
            Gender
            <select name="gender" className={selectCls}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Prefer not to say</option>
            </select>
          </label>
          <label className={labelCls}>
            Email address *
            <input name="email" type="email" required className={inputCls} placeholder="doctor@email.com" />
          </label>
          <label className={labelCls}>
            Mobile / WhatsApp number *
            <input name="phone" type="tel" required className={inputCls} placeholder="+91 98765 43210" />
          </label>
        </div>
      </div>

      {/* ── Section 2: Medical Qualification ── */}
      <div className={cardCls}>
        <SectionHeader
          num={2}
          title="Medical Qualification"
          sub="Your highest or primary medical degree."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelCls}>
            Qualification *
            <select name="qualification" required className={selectCls}>
              <option value="">Select</option>
              {QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}
            </select>
          </label>
          <label className={`${labelCls} sm:col-span-2`}>
            University / Institute
            <input name="university" className={inputCls} placeholder="e.g. AIIMS New Delhi" />
          </label>
          <label className={labelCls}>
            Year of passing
            <input
              name="qualificationYear"
              type="number"
              min={1960}
              max={new Date().getFullYear()}
              className={inputCls}
              placeholder="e.g. 2010"
            />
          </label>
        </div>
      </div>

      {/* ── Section 3: Medical Registration ── */}
      <div className={cardCls}>
        <SectionHeader
          num={3}
          title="Medical Registration"
          sub="Required under MoHFW Telemedicine Practice Guidelines 2020."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            Registration number *
            <input
              name="registrationNumber"
              required
              className={inputCls}
              placeholder="e.g. DMC/2010/12345"
            />
          </label>
          <label className={labelCls}>
            Year of registration
            <input
              name="registrationYear"
              type="number"
              min={1960}
              max={new Date().getFullYear()}
              className={inputCls}
              placeholder="e.g. 2010"
            />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>
            Registering council *
            <select name="registrationCouncil" required className={selectCls}>
              <option value="">Select council</option>
              {COUNCILS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ── Section 4: Practice Details ── */}
      <div className={cardCls}>
        <SectionHeader
          num={4}
          title="Practice Details"
          sub="Tell us about your speciality and experience."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            Primary speciality *
            <select name="speciality" required className={selectCls}>
              <option value="">Select speciality</option>
              {SPECIALITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className={labelCls}>
            Sub-speciality (optional)
            <input name="subSpeciality" className={inputCls} placeholder="e.g. Interventional Cardiology" />
          </label>
          <label className={labelCls}>
            Years of experience
            <input
              name="experienceYears"
              type="number"
              min={0}
              max={60}
              className={inputCls}
              placeholder="e.g. 8"
            />
          </label>
          <label className={labelCls}>
            Current hospital / clinic (optional)
            <input name="currentHospital" className={inputCls} placeholder="e.g. Apollo Hospitals, Hyderabad" />
          </label>
          <label className={labelCls}>
            City *
            <input name="city" required className={inputCls} placeholder="e.g. Hyderabad" />
          </label>
          <label className={labelCls}>
            State *
            <select name="state" required className={selectCls}>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ── Section 5: Telemedicine Preferences ── */}
      <div className={cardCls}>
        <SectionHeader
          num={5}
          title="Telemedicine Preferences"
          sub="How you prefer to consult with patients."
        />
        <div className="space-y-4">
          <div>
            <p className={`${labelCls} mb-2`}>Consultation modes *</p>
            <CheckboxList
              options={["Video", "Audio"]}
              selected={visitModes}
              onChange={setVisitModes}
            />
          </div>
          <div>
            <p className={`${labelCls} mb-2`}>Languages you consult in *</p>
            <CheckboxList options={LANGUAGES} selected={languages} onChange={setLanguages} />
          </div>
          <label className={labelCls}>
            Consultation fee (₹)
            <input
              name="feeRupees"
              type="number"
              min={0}
              max={10000}
              step={50}
              className={inputCls}
              placeholder="e.g. 500"
            />
          </label>
        </div>
      </div>

      {/* ── Section 6: Bio ── */}
      <div className={cardCls}>
        <SectionHeader
          num={6}
          title="Professional Bio"
          sub="This will appear on your public CalDoc profile."
        />
        <textarea
          name="bio"
          rows={4}
          className={inputCls}
          placeholder="e.g. I am a board-certified cardiologist with 12 years of experience in interventional cardiology. I specialise in..."
        />
        <p className="mt-1 text-[11px] text-slate-400">Keep it to 2–4 sentences. Patients read this before booking.</p>
      </div>

      {/* ── Section 7: Documents ── */}
      <div className={cardCls}>
        <SectionHeader
          num={7}
          title="Supporting Documents"
          sub="Uploaded securely to our servers. Accepted formats: PDF, JPG, PNG."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelCls}>
            Profile photo
            <input
              type="file"
              name="profilePhoto"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-400">JPG or PNG, ideally square.</p>
          </label>
          <label className={labelCls}>
            Medical degree certificate *
            <input
              type="file"
              name="qualificationDoc"
              accept="application/pdf,image/jpeg,image/png"
              required
              className="mt-1 w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-400">MBBS/MD/MS certificate.</p>
          </label>
          <label className={labelCls}>
            Registration certificate *
            <input
              type="file"
              name="registrationDoc"
              accept="application/pdf,image/jpeg,image/png"
              required
              className="mt-1 w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-400">State/MCI/NMC registration.</p>
          </label>
        </div>
      </div>

      {/* ── Section 8: Declaration ── */}
      <div className={cardCls}>
        <SectionHeader
          num={8}
          title="Declaration & Consent"
          sub="Required under the MoHFW Telemedicine Practice Guidelines, 2020."
        />
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 accent-[#2f6ea5]"
            />
            <span>
              I confirm that I am a Registered Medical Practitioner (RMP) and agree to practice
              telemedicine in accordance with the{" "}
              <span className="font-medium text-[#2f6ea5]">
                MoHFW Telemedicine Practice Guidelines, 2020
              </span>
              . I confirm that all information and documents submitted are accurate and authentic.
              I understand that providing false information may result in permanent disqualification. *
            </span>
          </label>
        </div>
      </div>

      {/* ── Error & Submit ── */}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/80 px-6 py-4 backdrop-blur-sm shadow-[0_4px_24px_rgba(47,110,165,0.07)]">
        <p className="text-xs text-slate-500 max-w-xs">
          Your application and documents are stored securely. We review every application manually.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#255b8b] disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}
