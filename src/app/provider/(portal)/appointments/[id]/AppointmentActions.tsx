"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AvailableSlot = {
  id: string;
  startsAt: string;
};

type LabOrderSummary = {
  id: string;
  tests: string[];
};

type FollowUp = {
  id: string;
  type: string;
  daysUntilDue: number | null;
  status: string;
  dueAt: string | null;
  providerNote: string | null;
};

type Props = {
  appointmentId: string;
  currentStatus: string;
  uploadLinkSent: boolean;
  availableSlots: AvailableSlot[];
  patientPhone?: string | null;
  labOrders: LabOrderSummary[];
  existingFollowUp: FollowUp | null;
};

const DAYS_OPTIONS = [3, 7, 14, 30] as const;

function formatSlotLabel(startsAt: string) {
  return new Date(startsAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatISTDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AppointmentActions({
  appointmentId,
  currentStatus,
  uploadLinkSent,
  availableSlots,
  patientPhone,
  labOrders,
  existingFollowUp,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "CONFIRM" | "CANCEL" | "NO_SHOW" | "COMPLETE">(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reslotId, setReslotId] = useState(availableSlots[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  // Follow-up state
  const [activeFollowUp, setActiveFollowUp] = useState<FollowUp | null>(existingFollowUp);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [fuType, setFuType] = useState<"TIMED" | "AFTER_LAB_RESULTS">("TIMED");
  const [fuDays, setFuDays] = useState(7);
  const [fuLabOrderId, setFuLabOrderId] = useState(labOrders[0]?.id ?? "");
  const [fuNote, setFuNote] = useState("");
  const [fuBusy, setFuBusy] = useState(false);
  const [fuError, setFuError] = useState<string | null>(null);
  const [fuSuccess, setFuSuccess] = useState<string | null>(null);

  async function handleAction(action: "CONFIRM" | "CANCEL" | "NO_SHOW" | "COMPLETE") {
    try {
      setBusy(action);
      setError(null);
      const res = await fetch(`/api/provider/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Request failed");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reslotId) {
      setError("Select a slot to proceed.");
      return;
    }
    try {
      setRescheduleBusy(true);
      setError(null);
      const res = await fetch(`/api/provider/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESCHEDULE", slotId: reslotId, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to reschedule");
      }
      setRescheduleOpen(false);
      setReason("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setRescheduleBusy(false);
    }
  }

  async function handleFollowUpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setFuBusy(true);
      setFuError(null);
      const body: Record<string, unknown> = { type: fuType, providerNote: fuNote || undefined };
      if (fuType === "TIMED") body.daysUntilDue = fuDays;
      if (fuType === "AFTER_LAB_RESULTS" && fuLabOrderId) body.labOrderId = fuLabOrderId;

      const res = await fetch(`/api/provider/appointments/${appointmentId}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to create follow-up");
      }
      const data = await res.json();

      const dueAt =
        fuType === "TIMED"
          ? new Date(Date.now() + fuDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

      setActiveFollowUp({
        id: data.followUpId,
        type: fuType,
        daysUntilDue: fuType === "TIMED" ? fuDays : null,
        status: "PENDING",
        dueAt,
        providerNote: fuNote || null,
      });
      setFuSuccess("Follow-up requested. Patient notified on WhatsApp.");
      setFollowUpModalOpen(false);
      setFuNote("");
    } catch (err) {
      setFuError((err as Error).message || "Unable to create follow-up");
    } finally {
      setFuBusy(false);
    }
  }

  const hasSlots = availableSlots.length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleAction("CONFIRM")}
          disabled={busy !== null || currentStatus === "CONFIRMED"}
          className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold shadow-sm ${
            currentStatus === "CONFIRMED"
              ? "bg-emerald-500 text-white"
              : "bg-[#2f6ea5] text-white hover:bg-[#255b8b] disabled:opacity-50"
          }`}
        >
          {busy === "CONFIRM"
            ? "Confirming…"
            : currentStatus === "CONFIRMED"
            ? "Confirmed"
            : "Confirm appointment"}
        </button>

        <button
          type="button"
          onClick={() => handleAction("CANCEL")}
          disabled={busy !== null || currentStatus === "CANCELLED"}
          className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {busy === "CANCEL" ? "Cancelling…" : "Cancel"}
        </button>

        <button
          type="button"
          onClick={() => handleAction("NO_SHOW")}
          disabled={busy !== null || currentStatus === "NO_SHOW"}
          className="inline-flex items-center rounded-full border border-amber-300 px-5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        >
          {busy === "NO_SHOW" ? "Updating…" : currentStatus === "NO_SHOW" ? "Marked no-show" : "Mark no-show"}
        </button>

        <button
          type="button"
          onClick={() => handleAction("COMPLETE")}
          disabled={busy !== null || currentStatus === "COMPLETED"}
          className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold shadow-sm ${
            currentStatus === "COMPLETED"
              ? "bg-emerald-600 text-white"
              : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          }`}
        >
          {busy === "COMPLETE"
            ? "Completing…"
            : currentStatus === "COMPLETED"
            ? "Consultation complete"
            : "End consultation"}
        </button>

        <button
          type="button"
          onClick={() => setRescheduleOpen(true)}
          disabled={!hasSlots}
          className="inline-flex items-center rounded-full border border-[#2f6ea5]/40 px-5 py-2 text-sm font-semibold text-[#2f6ea5] hover:bg-[#e7edf3] disabled:opacity-40"
        >
          Reschedule
        </button>
      </div>

      {/* Follow-up panel */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Follow-up
            </p>
            {activeFollowUp ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-medium text-slate-900">
                  {activeFollowUp.type === "TIMED"
                    ? `In ${activeFollowUp.daysUntilDue} day${activeFollowUp.daysUntilDue === 1 ? "" : "s"}`
                    : "After lab results"}
                  {" · "}
                  <span className="capitalize text-slate-500">{activeFollowUp.status.toLowerCase()}</span>
                </p>
                {activeFollowUp.dueAt && (
                  <p className="text-xs text-slate-500">Due {formatISTDate(activeFollowUp.dueAt)}</p>
                )}
                {activeFollowUp.providerNote && (
                  <p className="mt-1 text-xs italic text-slate-600">
                    &ldquo;{activeFollowUp.providerNote}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-slate-500">No follow-up requested yet.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setFuError(null);
              setFuSuccess(null);
              setFollowUpModalOpen(true);
            }}
            className="shrink-0 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            {activeFollowUp ? "Update" : "Request"}
          </button>
        </div>
        {fuSuccess && <p className="mt-2 text-xs text-emerald-700">{fuSuccess}</p>}
      </div>

      <p className="text-sm text-slate-600">
        Confirming will notify the patient and send a secure upload link.{" "}
        {uploadLinkSent ? "Upload link already sent." : "Link not sent yet."}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Reschedule modal */}
      {rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Reschedule appointment</h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setRescheduleOpen(false)}
              >
                Close
              </button>
            </div>
            {hasSlots ? (
              <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Choose a new slot
                  <select
                    value={reslotId}
                    onChange={(e) => setReslotId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {availableSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {formatSlotLabel(slot.startsAt)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Reason (optional)
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Patient requested a different time, provider unavailable, etc."
                  />
                </label>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={() => setRescheduleOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleBusy}
                    className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
                  >
                    {rescheduleBusy ? "Rescheduling…" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-500">
                  No open slots are available. Generate slots to reschedule this appointment.
                </p>
                <Link
                  href="/provider/schedule"
                  className="inline-flex items-center rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
                >
                  Open schedule builder →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-up request modal */}
      {followUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Request follow-up</h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setFollowUpModalOpen(false)}
              >
                Close
              </button>
            </div>
            <form onSubmit={handleFollowUpSubmit} className="mt-5 space-y-5">
              {/* Type */}
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Follow-up type</legend>
                <div className="mt-2 flex gap-3">
                  {(["TIMED", "AFTER_LAB_RESULTS"] as const).map((t) => (
                    <label
                      key={t}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                        fuType === t
                          ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fuType"
                        value={t}
                        checked={fuType === t}
                        onChange={() => setFuType(t)}
                        className="sr-only"
                      />
                      {t === "TIMED" ? "In N days" : "After lab results"}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Days (only for TIMED) */}
              {fuType === "TIMED" && (
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">Follow up in</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYS_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFuDays(d)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                          fuDays === d
                            ? "border-indigo-400 bg-indigo-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {/* Lab order (only for AFTER_LAB_RESULTS) */}
              {fuType === "AFTER_LAB_RESULTS" && labOrders.length > 0 && (
                <label className="block text-sm font-medium text-slate-700">
                  Linked lab order (optional)
                  <select
                    value={fuLabOrderId}
                    onChange={(e) => setFuLabOrderId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Any lab order</option>
                    {labOrders.map((lo) => (
                      <option key={lo.id} value={lo.id}>
                        {lo.tests.slice(0, 3).join(", ")}{lo.tests.length > 3 ? ` +${lo.tests.length - 3} more` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Provider note */}
              <label className="block text-sm font-medium text-slate-700">
                Note for patient{" "}
                <span className="font-normal text-slate-400">(optional, max 300 chars)</span>
                <textarea
                  value={fuNote}
                  onChange={(e) => setFuNote(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="E.g. Review blood pressure readings at next visit."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-right text-xs text-slate-400">
                  {fuNote.length}/300
                </span>
              </label>

              {fuError && <p className="text-sm text-red-600">{fuError}</p>}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={() => setFollowUpModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fuBusy || !patientPhone}
                  className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {fuBusy ? "Sending…" : "Request follow-up"}
                </button>
              </div>
              {!patientPhone && (
                <p className="text-xs text-amber-600">Patient phone not on file — cannot notify.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
