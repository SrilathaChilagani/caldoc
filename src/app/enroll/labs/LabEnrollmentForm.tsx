"use client";

import { useState } from "react";

const cardCls =
  "rounded-2xl border border-white/30 bg-white/80 backdrop-blur-sm p-6 shadow-[0_4px_24px_rgba(47,110,165,0.07)]";
const inputCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";
const labelCls = "block text-xs font-medium text-slate-600";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli",
  "Daman and Diu", "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export default function LabEnrollmentForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nablCertified, setNablCertified] = useState(false);
  const [homeCollection, setHomeCollection] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("nablCertified", nablCertified ? "true" : "false");
    data.set("homeCollection", homeCollection ? "true" : "false");
    setSubmitting(true);
    try {
      const res = await fetch("/api/enroll/labs", { method: "POST", body: data });
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
      <div className={`${cardCls} py-12 text-center`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Application Submitted!</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
          Thank you for applying as a CalDoc diagnostic lab partner. We will review your application and get back to you within 2–3 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Lab Details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`${labelCls} sm:col-span-2`}>
            Lab name *
            <input name="labName" required className={inputCls} placeholder="e.g. Vijaya Diagnostics" />
          </label>
          <label className={labelCls}>
            Contact person name *
            <input name="contactName" required className={inputCls} placeholder="e.g. Suresh Reddy" />
          </label>
          <label className={labelCls}>
            Email address *
            <input name="email" type="email" required className={inputCls} placeholder="lab@email.com" />
          </label>
          <label className={labelCls}>
            Phone / WhatsApp *
            <input name="phone" type="tel" required className={inputCls} placeholder="+91 98765 43210" />
          </label>
        </div>
      </div>

      {/* Address */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Address</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`${labelCls} sm:col-span-2`}>
            Address line 1 *
            <input name="addressLine1" required className={inputCls} placeholder="Street / Building" />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>
            Address line 2 (optional)
            <input name="addressLine2" className={inputCls} placeholder="Area / Landmark" />
          </label>
          <label className={labelCls}>
            City *
            <input name="city" required className={inputCls} placeholder="e.g. Hyderabad" />
          </label>
          <label className={labelCls}>
            State *
            <select name="state" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30">
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className={labelCls}>
            Pincode *
            <input name="pincode" required className={inputCls} placeholder="e.g. 500001" maxLength={6} />
          </label>
        </div>
      </div>

      {/* Certifications & Services */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Certifications &amp; Services</h2>
        <div className="space-y-4">
          {/* NABL */}
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={nablCertified}
              onChange={(e) => setNablCertified(e.target.checked)}
              className="accent-[#2f6ea5]"
            />
            NABL Certified
          </label>
          {nablCertified && (
            <label className={labelCls}>
              NABL Certificate Number
              <input name="nablCertNumber" className={inputCls} placeholder="e.g. MC-3456" />
            </label>
          )}

          {/* Home collection */}
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={homeCollection}
              onChange={(e) => setHomeCollection(e.target.checked)}
              className="accent-[#2f6ea5]"
            />
            Offers home sample collection
          </label>

          {/* Test categories */}
          <label className={labelCls}>
            Test categories (comma-separated)
            <textarea
              name="testCategories"
              rows={2}
              className={inputCls}
              placeholder="e.g. Blood tests, Urine analysis, ECG, MRI, CT Scan"
            />
            <span className="mt-0.5 block text-[10px] text-slate-400">List the types of tests you offer.</span>
          </label>

          {/* Notes */}
          <label className={labelCls}>
            Additional notes (optional)
            <textarea
              name="notes"
              rows={3}
              className={inputCls}
              placeholder="Any other information you'd like to share…"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/80 px-6 py-4 backdrop-blur-sm shadow-[0_4px_24px_rgba(47,110,165,0.07)]">
        <p className="max-w-xs text-xs text-slate-500">
          Your information is stored securely. We review every application manually.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#255b8b] disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Apply to Join"}
        </button>
      </div>
    </form>
  );
}
