"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  specialties: string[];
  currentQ: string;
  currentSpecialty: string;
  currentActive: string;
};

export default function ProviderFilters({ specialties, currentQ, currentSpecialty, currentActive }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    return `/admin/providers?${params.toString()}`;
  }

  function handleSelect(key: string, value: string) {
    router.push(buildUrl({ [key]: value }));
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = (fd.get("q") as string) || "";
    router.push(buildUrl({ q }));
  }

  const selectCls =
    "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20 cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
      {/* Status pills */}
      <div className="flex gap-1.5">
        {[
          { label: "All", value: "" },
          { label: "Active", value: "true" },
          { label: "Inactive", value: "false" },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => handleSelect("active", opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              currentActive === opt.value
                ? "bg-[#2f6ea5] text-white"
                : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Dropdowns + search — pushed to the right */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {/* Status dropdown */}
        <select
          value={currentActive}
          onChange={(e) => handleSelect("active", e.target.value)}
          className={selectCls}
        >
          <option value="">All providers</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>

        {/* Speciality dropdown */}
        <select
          value={currentSpecialty}
          onChange={(e) => handleSelect("specialty", e.target.value)}
          className={selectCls}
        >
          <option value="">All specialities</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Search input + button */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={currentQ}
            placeholder="Search name…"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
          <button
            type="submit"
            className="rounded-full bg-[#2f6ea5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b]"
          >
            Search
          </button>
        </form>

        {(currentQ || currentSpecialty || currentActive) && (
          <button
            type="button"
            onClick={() => router.push("/admin/providers")}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
