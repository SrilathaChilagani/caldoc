"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getErrorMessage } from "@/lib/errors";

export default function OfflineRequestActions({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(status: string) {
    startTransition(async () => {
      try {
        await fetch(`/api/offline-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        router.refresh();
      } catch (err) {
        alert(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button
        type="button"
        onClick={() => handleUpdate("IN_PROGRESS")}
        disabled={pending}
        className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-blue-200 hover:text-blue-700"
      >
        Mark in-progress
      </button>
      <button
        type="button"
        onClick={() => handleUpdate("RESOLVED")}
        disabled={pending}
        className="rounded-full border border-emerald-200 px-3 py-1 text-emerald-700 hover:border-emerald-300"
      >
        Resolve
      </button>
    </div>
  );
}
