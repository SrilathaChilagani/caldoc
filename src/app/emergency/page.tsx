"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SYMPTOMS = [
  "Fever",
  "Headache",
  "Dizziness",
  "Chest pain",
  "Sore throat",
  "Cough",
  "Shortness of breath",
  "Abdominal pain",
];

export default function EmergencyBookingPage() {
  const router = useRouter();
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
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create emergency booking");
      }
      // Redirect to checkout with a returnTo so after payment we land on the emergency confirmed page
      const returnTo = encodeURIComponent(`/emergency/confirmed/${data.appointmentId}`);
      router.push(
        `/checkout?appointmentId=${data.appointmentId}&amount=${data.amount}&returnTo=${returnTo}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-12 lg:py-20">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to home
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-slate-900">Emergency Consultation</h1>
              <p className="text-sm text-slate-500">A doctor will reach out within 5 minutes of booking.</p>
            </div>
          </div>
        </div>

        {/* Alert banner */}
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="font-semibold">Emergency line:</span> Available 24/7 for urgent consultations. Please fill in your details accurately so we can reach you immediately.
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient details */}
            <div>
              <h2 className="mb-4 font-semibold text-slate-800">Your Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mobile number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
                  />
                </div>
              </div>
            </div>

            {/* Consultation type */}
            <div>
              <h2 className="mb-3 font-semibold text-slate-800">Consultation Type</h2>
              <div className="flex gap-3">
                {(["VIDEO", "AUDIO"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVisitMode(mode)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                      visitMode === mode
                        ? "border-[#2f6ea5] bg-[#2f6ea5]/10 text-[#2f6ea5]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {mode === "VIDEO" ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="7" width="13" height="10" rx="2" />
                        <path d="M16 10l5-3v10l-5-3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                      </svg>
                    )}
                    {mode === "VIDEO" ? "Video Call" : "Audio Call"}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <h2 className="mb-3 font-semibold text-slate-800">Symptoms</h2>
              <p className="mb-3 text-sm text-slate-500">Select all that apply</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SYMPTOMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      symptoms.includes(s)
                        ? "border-[#2f6ea5] bg-[#2f6ea5]/10 font-medium text-[#2f6ea5]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block font-semibold text-slate-800">
                Additional notes
                <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Describe your symptoms, how long you've had them, any medications you're on…"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
              />
            </div>

            {/* Consent */}
            <p className="text-xs leading-relaxed text-slate-500">
              By submitting you confirm that you consent to a telemedicine consultation with a registered medical practitioner (NMC/State Medical Council), understand its limitations, and acknowledge that Schedule X controlled drugs cannot be prescribed via telemedicine.
            </p>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {loading ? "Booking…" : "Book Emergency Consultation — ₹499"}
            </button>

            <p className="text-center text-xs text-slate-400">
              Secure payment via Razorpay · UPI, cards, netbanking accepted
            </p>
          </form>
        </div>

        {/* Fee note */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-center text-xs text-slate-500">
          Emergency fee: ₹499 · Covers up to 30-min teleconsultation · Doctor assigned within 5 minutes
        </div>
      </div>
    </main>
  );
}
