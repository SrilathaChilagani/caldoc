"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  reservationId: string;
};

export default function ReleaseReservationButton({ reservationId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRelease() {
    setError(null);
    const res = await fetch(`/api/ngo/reservations/${reservationId}/release`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Unable to release slot");
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleRelease}
        disabled={isPending}
        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Releasing…" : "Release slot"}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
