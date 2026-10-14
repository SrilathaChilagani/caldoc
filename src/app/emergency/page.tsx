"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RED_FLAG_SYMPTOMS, URGENT_SYMPTOMS } from "@/config/redFlagSymptoms";

const FEE_DISPLAY = "₹499";

type TriageState = "triage" | "emergency" | "form";

export default function UrgentConsultationPage() {
  const router = useRouter();
  const [triageState, setTriageState] = useState<TriageState>("triage");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [visitMode, setVisitMode] = useState<"VIDEO" | "AUDIO">("VIDEO");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/appointments/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, visitMode, symptoms, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create booking");
      const returnTo = encodeURIComponent(`/emergency/confirmed/${data.appointmentId}`);
      router.push(`/checkout?appointmentId=${data.appointmentId}&amount=${data.amount}&returnTo=${returnTo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  // ── Step 1: Triage ────────────────────────────────────────────────────────
  if (triageState === "triage") {
    return (
      <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
        <div className="w-full px-6 lg:px-16 xl:px-24">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to Home
          </Link>

          <div className="mt-6 max-w-2xl">
            <h1 className="text-3xl font-bold text-slate-900">See a Doctor Now</h1>
            <p className="mt-2 text-slate-500">
              Urgent but non-life-threatening care · A doctor will contact you within 5 minutes of booking.
            </p>

            {/* Safety check card */}
            <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-rose-800">Safety check — please read before continuing</h2>
                  <p className="mt-1 text-sm text-rose-700">
                    This is a teleconsultation service for <strong>non-life-threatening</strong> urgent care.
                    If you or someone nearby is experiencing any of the following,{" "}
                    <strong>call 112 immediately</strong> or go to your nearest hospital emergency:
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2 pl-11">
                {RED_FLAG_SYMPTOMS.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-rose-800">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 text-rose-500" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" fill="none" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>

              <div className="mt-5 pl-11">
                <a
                  href="tel:112"
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  Call 112 — National Emergency
                </a>
              </div>
            </div>

            {/* Triage choice */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setTriageState("emergency")}
                className="flex-1 rounded-xl border-2 border-rose-300 bg-white px-6 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                I may have one of these symptoms
              </button>
              <button
                onClick={() => setTriageState("form")}
                className="flex-1 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#16304f]"
              >
                None of the above — continue to booking
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Step 2a: Emergency guidance ───────────────────────────────────────────
  if (triageState === "emergency") {
    return (
      <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
        <div className="w-full px-6 lg:px-16 xl:px-24">
          <div className="max-w-2xl">
            <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-600">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-rose-900">This may be a medical emergency</h1>
              </div>

              <p className="mt-4 text-base text-rose-800">
                The symptoms you described may require immediate in-person emergency care.
                A video or audio teleconsultation <strong>cannot replace emergency treatment</strong>.
              </p>

              <div className="mt-6 space-y-3">
                <a
                  href="tel:112"
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-rose-600 py-4 text-base font-bold text-white hover:bg-rose-700"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  Call 112 — National Emergency Number
                </a>
                <p className="text-center text-sm text-rose-700">
                  or go to your nearest hospital emergency department immediately.
                </p>
              </div>

              <div className="mt-6 border-t border-rose-200 pt-5">
                <p className="mb-3 text-sm text-rose-700">
                  If you believe your situation is <strong>not life-threatening</strong> and selected symptoms in error:
                </p>
                <button
                  onClick={() => setTriageState("form")}
                  className="text-sm font-medium text-rose-700 underline underline-offset-2 hover:text-rose-900"
                >
                  My condition is not life-threatening — continue to booking
                </button>
              </div>
            </div>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Step 2b: Booking form (confirmed non-emergency) ───────────────────────
  return (
    <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="w-full px-6 lg:px-16 xl:px-24">

        <button
          onClick={() => setTriageState("triage")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">Urgent Consultation</h1>
        <p className="mt-1 text-slate-500">For non-life-threatening urgent care · A doctor will reach out within 5 minutes.</p>

        {/* Persistent non-emergency reminder */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <span>
            This is an <strong>urgent teleconsultation</strong>, not an emergency service.
            For life-threatening conditions, call{" "}
            <a href="tel:112" className="font-bold underline underline-offset-2">112</a>.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-start">

            {/* ── Left: form ───────────────────────────────────── */}
            <div className="flex-1 space-y-10">

              {/* Consultation Type */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="7" width="13" height="10" rx="2" />
                    <path d="M16 10l5-3v10l-5-3" />
                  </svg>
                  <h2 className="text-lg font-semibold text-slate-800">Consultation Type</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(["VIDEO", "AUDIO"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setVisitMode(mode)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-6 py-5 text-sm font-medium transition ${
                        visitMode === mode
                          ? "border-[#1e3a5f] bg-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {mode === "VIDEO" ? (
                        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${visitMode === mode ? "text-[#1e3a5f]" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="7" width="13" height="10" rx="2" />
                          <path d="M16 10l5-3v10l-5-3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${visitMode === mode ? "text-[#1e3a5f]" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                        </svg>
                      )}
                      <span className={visitMode === mode ? "text-[#1e3a5f]" : ""}>
                        {mode === "VIDEO" ? "Video Call" : "Audio Call"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Patient Details */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <h2 className="text-lg font-semibold text-slate-800">Patient Details</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                      </svg>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Symptoms */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  <h2 className="text-lg font-semibold text-slate-800">Symptoms</h2>
                </div>
                <p className="mb-3 text-sm text-slate-500">Select all that apply</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {URGENT_SYMPTOMS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                        symptoms.includes(s)
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5 font-medium text-[#1e3a5f]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                        symptoms.includes(s) ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-slate-300"
                      }`}>
                        {symptoms.includes(s) && "✓"}
                      </span>
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              {/* Reason / Notes */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Reason for Visit{" "}
                    <span className="text-sm font-normal text-slate-400">(Optional)</span>
                  </h2>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Briefly describe your symptoms or reason for the urgent consultation…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
              </section>

            </div>

            {/* ── Right: Summary ────────────────────────────────── */}
            <div className="w-full lg:w-80 xl:w-96">
              <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-lg font-semibold text-slate-900">Appointment Summary</h3>

                <div className="space-y-4 divide-y divide-slate-100">
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium text-slate-800">Urgent Consultation</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">Mode</span>
                    <span className="font-medium text-slate-800">{visitMode === "VIDEO" ? "Video Call" : "Audio Call"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">Patient</span>
                    <span className="font-medium text-slate-800">{name || "—"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium text-slate-800">{phone || "—"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">Symptoms</span>
                    <span className="max-w-[160px] text-right font-medium text-slate-800">
                      {symptoms.length > 0 ? symptoms.join(", ") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">Fee</span>
                    <span className="font-semibold text-slate-900">{FEE_DISPLAY}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <span className="font-semibold">Doctor response:</span> Within 5 minutes of payment ·
                  Urgent, non-emergency care only
                </div>

                {error && (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full rounded-xl bg-[#1e3a5f] py-3 text-sm font-semibold text-white transition hover:bg-[#16304f] disabled:opacity-60"
                >
                  {loading ? "Booking…" : "Confirm Appointment"}
                </button>

                <p className="mt-3 text-center text-xs text-slate-400">
                  You will receive a confirmation on your phone number.
                </p>
                <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
                  By confirming you consent to a telemedicine consultation with a registered medical
                  practitioner and understand its limitations.
                </p>
              </div>
            </div>

          </div>
        </form>
      </div>
    </main>
  );
}
