"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getErrorMessage } from "@/lib/errors";

const LAB_STATUS_FLOW = ["PENDING", "SCHEDULED", "SAMPLE_COLLECTED", "PROCESSING", "READY"] as const;

type Props = {
  orderId: string;
  currentStatus: string;
};

export default function LabOrderActions({ orderId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleUpdate(status: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/labs/orders/${orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Unable to update");
        }
        setMessage(`Updated to ${status}`);
        router.refresh();
      } catch (err) {
        setMessage(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="space-y-1 text-xs text-slate-600">
      <div className="flex flex-wrap gap-2">
        {LAB_STATUS_FLOW.map((status) => (
          <button
            key={status}
            type="button"
            disabled={pending || status === currentStatus}
            onClick={() => handleUpdate(status)}
            className={`rounded-full border px-3 py-1 font-semibold ${
              status === currentStatus
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-700"
            } disabled:opacity-40`}
          >
            {status}
          </button>
        ))}
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
