"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AvailableSlot = {
  id: string;
  startsAt: string;
};

type Props = {
  appointmentId: string;
  currentStatus: string;
  uploadLinkSent: boolean;
  availableSlots: AvailableSlot[];
  patientPhone?: string | null;
};

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

export default function AppointmentActions({
  appointmentId,
  currentStatus,
  uploadLinkSent,
  availableSlots,
  patientPhone,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "CONFIRM" | "CANCEL" | "NO_SHOW">(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reslotId, setReslotId] = useState(availableSlots[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [followupBusy, setFollowupBusy] = useState(false);
  const [followupMessage, setFollowupMessage] = useState<string | null>(null);

  async function handleAction(action: "CONFIRM" | "CANCEL" | "NO_SHOW") {
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


  async function handleFollowupReminder() {
    if (!patientPhone) {
      setError('Patient phone unavailable');
      return;
    }
    try {
      setFollowupBusy(true);
      setError(null);
      setFollowupMessage(null);
      const res = await fetch(`/api/provider/appointments/${appointmentId}/followup`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to send reminder");
      }
      setFollowupMessage("Follow-up reminder sent on WhatsApp");
    } catch (err) {
      setError((err as Error).message || "Unable to send reminder");
    } finally {
      setFollowupBusy(false);
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
          onClick={() => setRescheduleOpen(true)}
          disabled={!hasSlots}
          className="inline-flex items-center rounded-full border border-[#2f6ea5]/40 px-5 py-2 text-sm font-semibold text-[#2f6ea5] hover:bg-[#e7edf3] disabled:opacity-40"
        >
          Reschedule
        </button>
        <button
          type="button"
          onClick={handleFollowupReminder}
          disabled={followupBusy || !patientPhone}
          className="inline-flex items-center rounded-full border border-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {followupBusy ? "Sending…" : "Send follow-up reminder"}
        </button>

      </div>
      <p className="text-sm text-slate-600">
        Confirming will notify the patient and send a secure upload link.{" "}
        {uploadLinkSent ? "Upload link already sent." : "Link not sent yet."}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

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
    </div>
  );
}
