"use client";

import { useState } from "react";

type Props = {
  appointmentId: string;
  patientName?: string | null;
};

export default function CallPatientButton({ appointmentId, patientName }: Props) {
  const [status, setStatus] = useState<"idle" | "calling" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus("calling");
    setMessage(null);
    try {
      const res = await fetch(`/api/provider/appointments/${appointmentId}/call`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to start call");
      }
      setStatus("success");
      setMessage("Connecting call via Exotel… keep your phone handy.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to start call");
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "calling"}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "calling" ? "Dialling…" : `Call ${patientName || "patient"}`}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-rose-600" : "text-slate-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
