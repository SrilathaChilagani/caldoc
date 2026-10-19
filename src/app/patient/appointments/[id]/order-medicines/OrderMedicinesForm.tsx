"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Med = { name: string; sig?: string | null; qty?: string | null };

type Props = {
  appointmentId: string;
  meds: Med[];
  patientName: string;
  patientPhone: string;
};

export default function OrderMedicinesForm({ appointmentId, meds, patientName, patientPhone }: Props) {
  const router = useRouter();
  const [address, setAddress] = useState({
    line1: "", line2: "", city: "", state: "", postalCode: "",
  });
  const [patientEmail, setPatientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patient/appointments/${appointmentId}/rx-from-prescription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, patientEmail: patientEmail || undefined }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not place order");
      router.push(`/patient/rx-orders/${data.orderId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prescribed items — read-only */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <h2 className="font-serif text-lg text-slate-900">Prescribed medicines</h2>
        <p className="mt-1 text-sm text-slate-500">
          These items will be pre-filled. The pharmacy will confirm availability and pricing.
        </p>
        <ul className="mt-4 divide-y divide-slate-100">
          {meds.map((med, i) => (
            <li key={i} className="py-3">
              <p className="text-sm font-semibold text-slate-900">{med.name}</p>
              {med.sig && <p className="text-xs text-slate-500">Dosage: {med.sig}</p>}
              {med.qty && <p className="text-xs text-slate-500">Qty: {med.qty}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* Patient info */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <h2 className="font-serif text-lg text-slate-900">Patient details</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt>
            <dd className="mt-0.5 text-slate-900">{patientName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
            <dd className="mt-0.5 text-slate-900">{patientPhone}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Email <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="email"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            className={inputCls}
            placeholder="you@email.com"
          />
        </div>
      </section>

      {/* Delivery address */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <h2 className="font-serif text-lg text-slate-900">Delivery address</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Street address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address.line1}
              onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
              className={inputCls}
              placeholder="House / flat / street"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Landmark / area <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={address.line2}
              onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
              className={inputCls}
              placeholder="Colony, landmark, area"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              City <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address.city}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              State <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address.state}
              onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              PIN code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              pattern="[0-9]{6}"
              value={address.postalCode}
              onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
              className={inputCls}
              placeholder="6-digit PIN"
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <div className="rounded-2xl border border-[#2f6ea5]/20 bg-[#e7edf3] px-4 py-3 text-sm text-[#1a4a72]">
        <strong>How this works:</strong> Once you submit, our pharmacy partner reviews your
        prescription and sends you a quote. You&apos;ll get a WhatsApp when it&apos;s ready —
        then you can confirm and pay.
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
      >
        {loading ? "Sending to pharmacy…" : `Send to pharmacy →`}
      </button>
    </form>
  );
}
