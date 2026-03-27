"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  reservationId: string;
  friendlyId: string;
  providerName: string;
  slotTime: string;
};

export default function ConfirmPatientButton({ reservationId, friendlyId, providerName, slotTime }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ patientName: "", patientPhone: "", patientEmail: "", visitMode: "VIDEO" });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientName.trim() || !form.patientPhone.trim()) {
      setError("Patient name and phone are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ngo/reservations/${reservationId}/confirm-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to assign patient.");
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null); }}
        className="rounded-lg bg-[#2f6ea5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b] transition-colors"
      >
        Assign patient
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">{friendlyId}</p>
              <h2 className="mt-0.5 text-base font-semibold text-slate-900">Assign patient to slot</h2>
              <p className="text-xs text-slate-500">{providerName} · {slotTime}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 block text-xs font-medium text-slate-600">
                  Patient full name *
                  <input
                    value={form.patientName}
                    onChange={(e) => set("patientName", e.target.value)}
                    placeholder="Ravi Kumar"
                    className={inputCls}
                    required
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Mobile number *
                  <input
                    value={form.patientPhone}
                    onChange={(e) => set("patientPhone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputCls}
                    required
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Email (optional)
                  <input
                    value={form.patientEmail}
                    onChange={(e) => set("patientEmail", e.target.value)}
                    placeholder="ravi@email.com"
                    type="email"
                    className={inputCls}
                  />
                </label>
              </div>

              {/* Visit mode */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Consultation mode</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["VIDEO", "AUDIO"] as const).map((mode) => (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        form.visitMode === mode
                          ? "border-[#2f6ea5] bg-[#2f6ea5]/5 font-medium text-slate-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visitMode"
                        value={mode}
                        checked={form.visitMode === mode}
                        onChange={() => set("visitMode", mode)}
                        className="accent-[#2f6ea5]"
                      />
                      {mode === "VIDEO" ? "Video call" : "Audio only"}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-[#2f6ea5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
                >
                  {loading ? "Confirming…" : "Confirm patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
