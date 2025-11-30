"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getErrorMessage } from "@/lib/errors";

const DELIVERY_STATUSES = ["READY", "PACKED", "SHIPPED", "DELIVERED"] as const;
const WHATSAPP_STATUSES = ["READY", "SENT"] as const;

type Props = {
  appointmentId: string;
  currentStatus: string;
  flow: "DELIVERY" | "WHATSAPP";
  canUpdate: boolean;
};

export default function PharmacyFulfillmentActions({ appointmentId, currentStatus, flow, canUpdate }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const statuses = flow === "DELIVERY" ? DELIVERY_STATUSES : WHATSAPP_STATUSES;

  function handleUpdate(status: string) {
    startTransition(async () => {
      try {
        setMessage(null);
        const res = await fetch(`/api/pharmacy/fulfillment/${appointmentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Update failed");
        }
        setMessage(`Updated to ${status}`);
        router.refresh();
      } catch (err) {
        setMessage(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="space-y-2 text-xs text-slate-600">
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => handleUpdate(status)}
            disabled={pending || status === currentStatus || !canUpdate}
            className={`rounded-full border px-3 py-1 font-semibold ${
              status === currentStatus
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-700"
            } disabled:opacity-50`}
          >
            {status}
          </button>
        ))}
      </div>
      {!canUpdate && (
        <p className="text-[11px] text-slate-500">Prescription pending — status updates disabled.</p>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
