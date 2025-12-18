"use client";

import { useState } from "react";

export default function ChangeNgoPasswordButton() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setMessage(null);
      return;
    }
    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/ngo/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to update password");
      }
      setMessage("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
      >
        Change password
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Update password</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  required
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-emerald-600">{message}</p>}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {busy ? "Updating…" : "Save password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
