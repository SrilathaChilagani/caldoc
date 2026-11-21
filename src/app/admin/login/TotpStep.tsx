"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TotpStep({ nextUrl }: { nextUrl: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/auth/totp/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nextUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid code"); setLoading(false); return; }
      router.push(data.redirect ?? "/admin");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Authenticator code
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9 ]*"
            maxLength={7}
            autoFocus
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000 000"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-xl tracking-widest font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            required
          />
        </label>
      </div>
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <button
        type="submit"
        disabled={loading || code.replace(/\s/g, "").length < 6}
        className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
