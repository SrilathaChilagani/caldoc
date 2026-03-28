"use client";

import { useRouter } from "next/navigation";

type Provider = { id: string; name: string };

export default function AdminAppointmentFilters({
  statusFilter,
  providerFilter,
  providers,
}: {
  statusFilter: string;
  providerFilter: string;
  providers: Provider[];
}) {
  const router = useRouter();

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (providerFilter) params.set("provider", providerFilter);
    params.set("page", "1");
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/appointments${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => router.push(buildHref({ status: e.target.value, page: "1" }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
        >
          <option value="">All statuses</option>
          {["CONFIRMED", "PENDING", "CANCELLED", "RESCHEDULED", "NO_SHOW", "COMPLETED"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Provider dropdown */}
      {providers.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Provider
          </label>
          <select
            value={providerFilter}
            onChange={(e) => router.push(buildHref({ provider: e.target.value, page: "1" }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
          >
            <option value="">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clear link */}
      {(statusFilter || providerFilter) && (
        <button
          type="button"
          onClick={() => router.push("/admin/appointments")}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
        >
          Clear filters ×
        </button>
      )}
    </div>
  );
}
