"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export default function ProviderStatusToggle({
  providerId,
  initialActive,
}: {
  providerId: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleToggle(next: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to update status");
      }
      setActive(next);
      setMessage(next ? "Activated" : "Deactivated");
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span
        className={`rounded-full px-2 py-1 font-semibold ${
          active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
      <button
        type="button"
        onClick={() => handleToggle(!active)}
        disabled={busy}
        className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
      >
        {active ? "Off-board" : "Re-activate"}
      </button>
      {message && <span className="text-slate-500">{message}</span>}
    </div>
  );
}
