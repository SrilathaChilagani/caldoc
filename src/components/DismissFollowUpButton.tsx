"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DismissFollowUpButton({ followUpId }: { followUpId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDismiss() {
    try {
      setBusy(true);
      await fetch(`/api/patient/follow-ups/${followUpId}/dismiss`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDismiss}
      disabled={busy}
      className="text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
    >
      {busy ? "Dismissing…" : "Dismiss"}
    </button>
  );
}
