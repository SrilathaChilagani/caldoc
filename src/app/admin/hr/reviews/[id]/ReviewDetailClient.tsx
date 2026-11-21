"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string; employeeCode: string; jobTitle: string; department: { name: string } };
type Reviewer = { id: string; name: string; jobTitle: string };

type Review = {
  id: string;
  status: string;
  period: string;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  goalsNextPeriod: string | null;
  privateNotes: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
  reviewer: Reviewer;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-50 text-amber-700",
  ACKNOWLEDGED: "bg-emerald-50 text-emerald-700",
};

const RATINGS = [1, 2, 3, 4, 5];
const RATING_LABELS: Record<number, string> = {
  1: "Needs improvement",
  2: "Below expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Outstanding",
};

export default function ReviewDetailClient({ review: initial }: { review: Review }) {
  const router = useRouter();
  const [review, setReview] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // form state
  const [rating, setRating] = useState<number | null>(review.overallRating);
  const [strengths, setStrengths] = useState(review.strengths ?? "");
  const [improvements, setImprovements] = useState(review.improvements ?? "");
  const [goals, setGoals] = useState(review.goalsNextPeriod ?? "");
  const [privateNotes, setPrivateNotes] = useState(review.privateNotes ?? "");
  const isDraft = review.status === "DRAFT";

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/hr/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
    return res.json();
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await patch({ overallRating: rating, strengths, improvements, goalsNextPeriod: goals, privateNotes });
      setReview(updated);
      setSuccess("Saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(action: string) {
    setActionLoading(action); setError(""); setSuccess("");
    try {
      const updated = await patch({ action });
      setReview(updated);
      setSuccess(action === "SUBMIT" ? "Review submitted." : action === "ACKNOWLEDGE" ? "Review acknowledged." : "Reopened.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading("");
    }
  }

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30 disabled:bg-slate-50 disabled:text-slate-500";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: form */}
      <div className="lg:col-span-2 space-y-4">
        {/* Rating */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Review details</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_COLORS[review.status] ?? "bg-slate-100 text-slate-600"}`}>
              {review.status}
            </span>
          </div>

          {/* Star rating */}
          <div className="space-y-1">
            <label className={labelClass}>Overall rating</label>
            <div className="flex items-center gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={!isDraft}
                  onClick={() => setRating(rating === r ? null : r)}
                  className={`w-10 h-10 rounded-xl text-lg font-bold transition-colors ${
                    rating === r
                      ? "bg-[#2f6ea5] text-white"
                      : "border border-slate-200 text-slate-400 hover:border-[#2f6ea5] hover:text-[#2f6ea5] disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:text-slate-400"
                  }`}
                >
                  {r}
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-slate-500">{RATING_LABELS[rating]}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Strengths</label>
            <textarea
              className={fieldClass}
              rows={3}
              disabled={!isDraft}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Key strengths observed this period…"
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Areas for improvement</label>
            <textarea
              className={fieldClass}
              rows={3}
              disabled={!isDraft}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="Specific areas to develop…"
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Goals for next period</label>
            <textarea
              className={fieldClass}
              rows={3}
              disabled={!isDraft}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Agreed targets and milestones…"
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Private notes (admin only)</label>
            <textarea
              className={fieldClass}
              rows={2}
              disabled={!isDraft}
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Internal notes not shared with employee…"
            />
          </div>

          {isDraft && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
          )}

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          {success && <p className="text-xs font-medium text-emerald-600">{success}</p>}
        </div>
      </div>

      {/* Right: metadata + actions */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Info</h2>
          <dl className="space-y-2">
            {[
              { label: "Employee", value: `${review.employee.name} (${review.employee.employeeCode})` },
              { label: "Department", value: review.employee.department.name },
              { label: "Job title", value: review.employee.jobTitle },
              { label: "Reviewer", value: `${review.reviewer.name} — ${review.reviewer.jobTitle}` },
              { label: "Period", value: review.period },
              { label: "Created", value: new Date(review.createdAt).toLocaleDateString("en-IN") },
              ...(review.submittedAt ? [{ label: "Submitted", value: new Date(review.submittedAt).toLocaleDateString("en-IN") }] : []),
              ...(review.acknowledgedAt ? [{ label: "Acknowledged", value: new Date(review.acknowledgedAt).toLocaleDateString("en-IN") }] : []),
            ].map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
                <dd className="text-sm text-slate-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Actions</h2>

          {review.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => handleAction("SUBMIT")}
              disabled={!!actionLoading}
              className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {actionLoading === "SUBMIT" ? "Submitting…" : "Submit for acknowledgement"}
            </button>
          )}

          {review.status === "SUBMITTED" && (
            <>
              <button
                type="button"
                onClick={() => handleAction("ACKNOWLEDGE")}
                disabled={!!actionLoading}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === "ACKNOWLEDGE" ? "Acknowledging…" : "Mark as acknowledged"}
              </button>
              <button
                type="button"
                onClick={() => handleAction("REOPEN")}
                disabled={!!actionLoading}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {actionLoading === "REOPEN" ? "Reopening…" : "Reopen as draft"}
              </button>
            </>
          )}

          {review.status === "ACKNOWLEDGED" && (
            <button
              type="button"
              onClick={() => handleAction("REOPEN")}
              disabled={!!actionLoading}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {actionLoading === "REOPEN" ? "Reopening…" : "Reopen as draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
