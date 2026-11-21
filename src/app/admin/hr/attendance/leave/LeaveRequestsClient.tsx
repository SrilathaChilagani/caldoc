"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeaveRow = {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  employee: { id: string; name: string; employeeCode: string; department: { name: string } };
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const LEAVE_LABELS: Record<string, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  UNPAID: "Unpaid",
  COMPENSATORY: "Compensatory",
};

export default function LeaveRequestsClient({
  pending,
  history,
}: {
  pending: LeaveRow[];
  history: LeaveRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  async function handleAction(id: string, action: "APPROVED" | "REJECTED") {
    setLoading(id);
    try {
      await fetch(`/api/admin/hr/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote }),
      });
      setActiveId(null);
      setReviewNote("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function LeaveCard({ leave }: { leave: LeaveRow }) {
    const isActive = activeId === leave.id;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-900">{leave.employee.name}
              <span className="ml-2 text-xs font-normal text-slate-400">{leave.employee.employeeCode}</span>
            </p>
            <p className="text-xs text-slate-500">{leave.employee.department.name}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[leave.status] ?? "bg-slate-100 text-slate-600"}`}>
            {leave.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-400">Type</p>
            <p className="text-slate-700">{LEAVE_LABELS[leave.leaveType] ?? leave.leaveType}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-400">Duration</p>
            <p className="text-slate-700">{leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-400">Dates</p>
            <p className="text-slate-700">{leave.fromDate} → {leave.toDate}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reason</p>
          <p className="text-sm text-slate-700">{leave.reason}</p>
        </div>

        {leave.status === "PENDING" && (
          <>
            {isActive ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Review note (optional)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(leave.id, "APPROVED")}
                    disabled={loading === leave.id}
                    className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(leave.id, "REJECTED")}
                    disabled={loading === leave.id}
                    className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => { setActiveId(null); setReviewNote(""); }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setActiveId(leave.id)}
                className="w-full rounded-xl border border-[#2f6ea5] px-3 py-2 text-xs font-semibold text-[#2f6ea5] hover:bg-[#2f6ea5]/5"
              >
                Review
              </button>
            )}
          </>
        )}

        {leave.reviewNote && (
          <p className="text-xs text-slate-500 italic">Review note: {leave.reviewNote}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Pending approval ({pending.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((l) => <LeaveCard key={l.id} leave={l} />)}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No pending leave requests</p>
          <p className="mt-1 text-xs text-slate-400">All caught up.</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent history</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{l.employee.name}</p>
                      <p className="text-xs text-slate-400">{l.employee.department.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{LEAVE_LABELS[l.leaveType] ?? l.leaveType}</td>
                    <td className="px-4 py-3 text-slate-600">{l.fromDate} → {l.toDate}</td>
                    <td className="px-4 py-3 text-slate-600">{l.totalDays}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
