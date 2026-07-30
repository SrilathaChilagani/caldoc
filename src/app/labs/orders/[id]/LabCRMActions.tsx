"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Statuses lab partner can advance to (payment states and cancellation are admin-only)
const NEXT_STATUS: Record<string, { value: string; label: string; hint: string }> = {
  PENDING: {
    value: "CONFIRMED",
    label: "Confirm order",
    hint: "Accept this order and assign a collection agent.",
  },
  CONFIRMED: {
    value: "SAMPLE_COLLECTED",
    label: "Mark sample collected",
    hint: "Agent went to patient's home and collected the sample.",
  },
  SAMPLE_COLLECTED: {
    value: "PROCESSING",
    label: "Start processing",
    hint: "Sample is back at the lab and tests are underway.",
  },
  PROCESSING: {
    value: "REPORTS_READY",
    label: "Mark reports ready",
    hint: "Upload the results PDF below to notify patient automatically.",
  },
  REPORTS_READY: {
    value: "COMPLETED",
    label: "Mark completed",
    hint: "Patient has acknowledged results and case is closed.",
  },
};

const NEEDS_AGENT = ["PENDING", "CONFIRMED"];

type Props = {
  orderId: string;
  currentStatus: string;
  currentAgentName?: string | null;
  currentAgentPhone?: string | null;
};

export default function LabCRMActions({
  orderId,
  currentStatus,
  currentAgentName,
  currentAgentPhone,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [agentName, setAgentName] = useState(currentAgentName || "");
  const [agentPhone, setAgentPhone] = useState(currentAgentPhone || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const next = NEXT_STATUS[currentStatus];
  const showAgent = NEEDS_AGENT.includes(currentStatus);

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!next) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/labs/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next.value,
          collectionAgentName: agentName || undefined,
          collectionAgentPhone: agentPhone || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setSuccess(`Order moved to "${next.label}".`);
      setNote("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResultsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/labs/orders/${orderId}/results`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setSuccess("Results uploaded. Patient and prescriber have been notified.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  }

  const canUploadResults = ["SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY"].includes(currentStatus);

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>
      )}

      {/* Status advance */}
      {next && (
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {next.hint}
          </div>

          {showAgent && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Collection agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Agent phone</label>
                <input
                  type="text"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for this update…"
              className={`${inputCls} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#2f6ea5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
          >
            {loading ? "Saving…" : next.label}
          </button>
        </form>
      )}

      {/* Results upload */}
      {canUploadResults && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">Upload results (PDF / JPG / PNG, max 10 MB)</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-dashed border-teal-300 px-4 py-3 text-sm font-semibold text-teal-700 hover:border-teal-500 hover:bg-teal-50">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M4 16v4h16v-4M12 4v12M8 8l4-4 4 4" />
            </svg>
            {uploadLoading ? "Uploading…" : "Choose file to upload"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={uploadLoading}
              onChange={handleResultsUpload}
            />
          </label>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Uploading sets status to Reports Ready and notifies patient + prescriber via WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}
