"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  creds: "Incorrect email or password.",
};

export default function LoginForm({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  void searchParams; // resolved client-side via useSearchParams
  const sp = useSearchParams();
  const err = sp.get("err");
  const uid = sp.get("uid") || "";

  const [busy, setBusy] = useState(false);

  return (
    <form
      action="/api/frontdesk/login"
      method="POST"
      onSubmit={() => setBusy(true)}
      className="space-y-4"
    >
      {err && (
        <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {ERROR_MESSAGES[err] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
        <input
          type="email"
          name="email"
          defaultValue={uid}
          required
          autoComplete="email"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="frontdesk@caldoc.in"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
