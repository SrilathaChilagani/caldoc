"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function HeroSearchForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmedQ = q.trim();
    const trimmedSpec = specialty.trim();
    if (trimmedQ) params.set("q", trimmedQ);
    if (trimmedSpec) params.set("specialty", trimmedSpec);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/providers?${qs}` : "/providers");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-10 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-white/60 bg-white/70 p-2 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] backdrop-blur-xl sm:flex-row sm:items-center"
    >
      <div className="relative flex-1">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search doctors, specialties, symptoms…"
          className="h-12 w-full rounded-xl border-0 bg-white/60 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#2f6ea5]/30"
        />
      </div>
      <input
        name="specialty"
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
        placeholder="Specialty (optional)"
        className="h-12 w-full rounded-xl border-0 bg-white/60 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#2f6ea5]/30 sm:max-w-[180px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-[#2f6ea5] px-6 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Searching…" : "Find a doctor"}
      </button>
    </form>
  );
}
