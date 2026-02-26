"use client";
import { useState } from "react";

export default function ProviderSettingsPage() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.next !== form.confirm) {
      setError("New passwords do not match");
      return;
    }
    if (form.next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/provider/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: form.current, next: form.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update password");
      setStatus("saved");
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Change password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use a strong password with at least 8 characters.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] space-y-4"
      >
        <div>
          <label className="text-sm font-semibold text-slate-700">Current password</label>
          <input
            type="password"
            required
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Confirm new password</label>
          <input
            type="password"
            required
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {status === "saved" && (
          <p className="text-sm font-semibold text-emerald-600">Password updated successfully.</p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-full bg-[#2f6ea5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#255a8a] disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
