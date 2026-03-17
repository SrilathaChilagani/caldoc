"use client";

import { useRouter } from "next/navigation";

type Provider = { id: string; name: string };

export default function ProviderFilter({
  providers,
  current,
  statusFilter,
}: {
  providers: Provider[];
  current: string;
  statusFilter: string;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams();
    if (e.target.value) p.set("provider", e.target.value);
    if (statusFilter) p.set("status", statusFilter);
    const qs = p.toString();
    router.push(`/frontdesk/appointments${qs ? `?${qs}` : ""}`);
  }

  return (
    <select
      defaultValue={current}
      onChange={onChange}
      className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-[#2f6ea5] focus:outline-none"
    >
      <option value="">All providers</option>
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
