"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function PharmacyEnrollmentActions({
  enrollmentId,
  adminEmail,
}: {
  enrollmentId: string;
  adminEmail: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleApprove() {
    if (!confirm("Approve this pharmacy? This will create a pharmacy partner account and notify them via WhatsApp.")) return;
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/enrollments/pharmacy/${enrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Approval failed.");
      setSuccess("Pharmacy approved and partner account created!");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      setError("Please enter a reason for rejection.");
      return;
    }
    setRejecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/enrollments/pharmacy/${enrollmentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), adminEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rejection failed.");
      setSuccess("Application rejected.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRejecting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-800">Done!</p>
        <p className="mt-1 whitespace-pre-line text-sm text-emerald-700">{success}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">Review Decision</h2>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={approving}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {approving ? "Approving…" : "Approve & Onboard"}
        </button>
        <button
          type="button"
          onClick={() => { setShowRejectForm((v) => !v); setError(null); }}
          className="rounded-full border border-rose-200 px-6 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          Reject
        </button>
      </div>

      {showRejectForm && (
        <div className="space-y-3 border-t border-slate-100 pt-2">
          <label className="block text-xs font-medium text-slate-600">
            Reason for rejection (recorded internally)
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Drug license could not be verified. Please reapply with a valid document."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-rose-400 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={handleReject}
            disabled={rejecting}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {rejecting ? "Rejecting…" : "Confirm rejection"}
          </button>
        </div>
      )}
    </div>
  );
}
