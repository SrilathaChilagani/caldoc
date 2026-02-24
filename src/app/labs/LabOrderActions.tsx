"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getErrorMessage } from "@/lib/errors";

const LAB_STATUS_FLOW = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SAMPLE_COLLECTED", label: "Sample collected" },
  { value: "PROCESSING", label: "Processing" },
  { value: "REPORTS_READY", label: "Reports ready" },
  { value: "COMPLETED", label: "Completed" },
] as const;

type Props = {
  orderId: string;
  currentStatus: string;
  collectionAgentName?: string | null;
  collectionAgentPhone?: string | null;
};

export default function LabOrderActions({ orderId, currentStatus, collectionAgentName, collectionAgentPhone }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [agentName, setAgentName] = useState(collectionAgentName || "");
  const [agentPhone, setAgentPhone] = useState(collectionAgentPhone || "");
  const [showAgent, setShowAgent] = useState(false);
  const router = useRouter();

  function handleUpdate(status: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/labs/orders/${orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            collectionAgentName: agentName || undefined,
            collectionAgentPhone: agentPhone || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Unable to update");
        }
        setMessage(`Status updated to ${status}`);
        setShowAgent(false);
        router.refresh();
      } catch (err) {
        setMessage(getErrorMessage(err));
      }
    });
  }

  const needsAgent = ["SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY"].includes(currentStatus);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap gap-1.5">
        {LAB_STATUS_FLOW.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={pending || value === currentStatus}
            onClick={() => {
              if (["SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY"].includes(value)) {
                setShowAgent(true);
              }
              handleUpdate(value);
            }}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
              value === currentStatus
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            } disabled:opacity-40`}
          >
            {label}
          </button>
        ))}
      </div>
      {(showAgent || needsAgent) && (
        <div className="space-y-1">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent name"
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-[#2f6ea5] focus:outline-none"
          />
          <input
            type="text"
            value={agentPhone}
            onChange={(e) => setAgentPhone(e.target.value)}
            placeholder="Agent phone"
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-[#2f6ea5] focus:outline-none"
          />
        </div>
      )}
      {message && <p className="text-[11px] text-slate-500">{message}</p>}
    </div>
  );
}
