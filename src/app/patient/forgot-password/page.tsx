"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/patient/password/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="text-center space-y-1 mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Patient portal</p>
          <h2 className="text-2xl font-semibold text-slate-900">Reset your password</h2>
          <p className="text-sm text-slate-500">Enter your email and we&apos;ll send a reset link.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 text-center">
            If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-sm">
          <a href="/patient/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}
