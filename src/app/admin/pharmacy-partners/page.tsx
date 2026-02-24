import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export default async function PharmacyPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; q?: string; active?: string }>;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/pharmacy-partners");

  const sp = await searchParams;
  const query = sp.q?.trim() || "";
  const activeFilter = sp.active ?? "";

  const where: Record<string, unknown> = {};
  if (activeFilter === "true") where.isActive = true;
  if (activeFilter === "false") where.isActive = false;
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { city: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  const [partners, totalActive, totalInactive] = await Promise.all([
    prisma.pharmacyPartner.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.pharmacyPartner.count({ where: { isActive: true } }),
    prisma.pharmacyPartner.count({ where: { isActive: false } }),
  ]);

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Pharmacy Partners</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage partner pharmacies that fulfil Rx delivery orders.
        </p>
      </div>

      {sp.created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Pharmacy partner onboarded successfully.
        </div>
      )}

      {/* KPI + action */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{totalActive}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Inactive</p>
          <p className="mt-1 text-2xl font-semibold text-slate-500">{totalInactive}</p>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
          <Link
            href="/admin/pharmacy-partners/onboard"
            className="inline-flex items-center justify-center rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
          >
            + Onboard pharmacy
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="flex gap-1.5">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ].map((opt) => (
            <Link
              key={opt.label}
              href={`/admin/pharmacy-partners?active=${opt.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeFilter === opt.value
                  ? "bg-[#2f6ea5] text-white"
                  : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <form className="ml-auto flex items-center gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search name / city / email…"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-[#2f6ea5] focus:outline-none"
          />
          {activeFilter && <input type="hidden" name="active" value={activeFilter} />}
          <button type="submit" className="rounded-full bg-[#2f6ea5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b]">
            Search
          </button>
        </form>
      </div>

      {/* Partner grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {partners.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-slate-400">No pharmacy partners found.</p>
        ) : (
          partners.map((p) => (
            <div key={p.id} className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.city}, {p.state} · {p.pincode}</p>
                  <p className="truncate text-xs text-slate-400">{p.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p><span className="font-medium text-slate-700">Contact:</span> {p.contactName} · {p.phone}</p>
                <p><span className="font-medium text-slate-700">Drug License:</span> {p.drugLicenseNumber}</p>
                {p.gstNumber && <p><span className="font-medium text-slate-700">GST:</span> {p.gstNumber}</p>}
                {p.serviceAreas.length > 0 && (
                  <p><span className="font-medium text-slate-700">Service areas:</span> {p.serviceAreas.join(", ")}</p>
                )}
              </div>

              {p.notes && (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs italic text-slate-500">{p.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
