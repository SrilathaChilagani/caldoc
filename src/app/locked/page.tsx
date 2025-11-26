"use client";

import { useState } from "react";

export default function LockedPage() {
  const [password, setPassword] = useState("");

  const login = () => {
    if (!password) return;
    document.cookie = `APP_LOCK=${password}; path=/`;
    window.location.href = "/";
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-4 p-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Private preview</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the access password to view the site.</p>
        <input
          type="password"
          placeholder="Enter password"
          className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={login}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Unlock site
        </button>
      </div>
    </main>
  );
}
