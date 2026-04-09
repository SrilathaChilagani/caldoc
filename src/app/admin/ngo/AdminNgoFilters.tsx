"use client";

import { useRouter } from "next/navigation";

type Ngo = { id: string; name: string };

export default function AdminNgoFilters({
  statusFilter,
  ngoFilter,
  ngos,
}: {
  statusFilter: string;
  ngoFilter: string;
  ngos: Ngo[];
}) {
  const router = useRouter();

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (ngoFilter) params.set("ngo", ngoFilter);
    params.set("page", "1");
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/ngo${qs ? `?${qs}` : ""}`;
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
          {["HELD", "CONFIRMED", "INVOICE_REQUESTED", "RELEASED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* NGO dropdown */}
      {ngos.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            NGO
          </label>
          <select
            value={ngoFilter}
            onChange={(e) => router.push(buildHref({ ngo: e.target.value, page: "1" }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
          >
            <option value="">All NGOs</option>
            {ngos.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clear link */}
      {(statusFilter || ngoFilter) && (
        <button
          type="button"
          onClick={() => router.push("/admin/ngo")}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
        >
          Clear filters ×
        </button>
      )}
    </div>
  );
}
