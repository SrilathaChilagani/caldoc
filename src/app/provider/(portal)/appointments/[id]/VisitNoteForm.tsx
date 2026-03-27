"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  appointmentId: string;
  initialText: string;
};

export default function VisitNoteForm({ appointmentId, initialText }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [note, setNote] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/provider/appointments/${appointmentId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to save note");
      }
      setMessage("Note saved");
      startTransition(() => router.refresh());
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={6}
        className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
        placeholder="Summarize the consultation and next steps"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </form>
  );
}
