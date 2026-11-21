"use client";

import { useState } from "react";

type Props = {
  appointmentId: string;
  providerName: string;
  existingRating?: number | null;
};

export default function RatingPrompt({ appointmentId, providerName, existingRating }: Props) {
  const [rating, setRating] = useState<number>(existingRating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingRating);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!rating) { setError("Please select a rating"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/patient/appointments/${appointmentId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to submit");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSaving(false);
    }
  }

  const labels: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very good", 5: "Excellent" };
  const display = hovered || rating;

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-800">Thank you for your feedback!</p>
        <p className="mt-0.5 text-xs text-emerald-600">
          You rated Dr. {providerName} {rating} star{rating !== 1 ? "s" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">How was your consultation?</p>
        <p className="text-xs text-slate-500">Rate your experience with Dr. {providerName}</p>
      </div>

      {/* Star picker */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            className="text-2xl transition-transform hover:scale-110"
            aria-label={`${star} star`}
          >
            {star <= display ? "★" : "☆"}
          </button>
        ))}
        {display > 0 && (
          <span className="ml-2 text-sm font-medium text-slate-600">{labels[display]}</span>
        )}
      </div>

      {/* Comment */}
      <textarea
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        rows={2}
        placeholder="Leave a comment (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !rating}
        className="rounded-xl bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
      >
        {saving ? "Submitting…" : "Submit rating"}
      </button>
    </div>
  );
}
