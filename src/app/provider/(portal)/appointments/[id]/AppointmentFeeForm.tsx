"use client";

import { FormEvent, useState } from "react";

type Props = {
  appointmentId: string;
  initialFeePaise?: number | null;
};

export default function AppointmentFeeForm({ appointmentId, initialFeePaise }: Props) {
  const [feeRupees, setFeeRupees] = useState(() =>
    typeof initialFeePaise === "number" && initialFeePaise > 0 ? (initialFeePaise / 100).toString() : "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const rupees = Number(feeRupees);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/provider/appointments/${appointmentId}/fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feePaise: Math.round(rupees * 100) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Unable to update fee");
      }
      setMessage("Fee updated");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="text-sm text-slate-600">
        Amount (₹)
        <input
          type="number"
          step="0.01"
          min="0"
          value={feeRupees}
          onChange={(e) => setFeeRupees(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
          placeholder="e.g. 599"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:mt-6"
      >
        {saving ? "Saving..." : "Update fee"}
      </button>
      {message && <span className="text-xs font-medium text-emerald-600">{message}</span>}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </form>
  );
}
