import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import ProviderStatusToggle from "./ProviderStatusToggle";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ active?: string; q?: string }>;

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/providers");

  const sp = await searchParams;
  const activeFilter = sp.active; // "true" | "false" | undefined
  const query = sp.q?.trim() || "";

  const where: Record<string, unknown> = {};
  if (activeFilter === "true") where.isActive = true;
  if (activeFilter === "false") where.isActive = false;
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { speciality: { contains: query, mode: "insensitive" } },
    ];
  }

  const [providers, totalActive, totalInactive] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            appointments: true,
            slots: true,
          },
        },
        users: { select: { email: true }, take: 1 },
      },
    }),
    prisma.provider.count({ where: { isActive: true } }),
    prisma.provider.count({ where: { isActive: false } }),
  ]);

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (activeFilter !== undefined) params.set("active", activeFilter);
    if (query) params.set("q", query);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/providers${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Providers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage all doctors on the platform — onboard, activate, deactivate.
        </p>
      </div>

      {/* KPI + actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{totalActive}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Inactive</p>
          <p className="mt-1 text-2xl font-semibold text-slate-500">{totalInactive}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
          <Link
            href="/admin/providers/onboard"
            className="inline-flex items-center justify-center rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
          >
            + Onboard provider
          </Link>
          <Link
            href="/admin/slots"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
          >
            Schedule slots
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="flex gap-1.5">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ].map((opt) => (
            <Link
              key={opt.label}
              href={buildHref({ active: opt.value, q: query })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                (activeFilter ?? "") === opt.value
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
            placeholder="Search name / speciality…"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
          {activeFilter && <input type="hidden" name="active" value={activeFilter} />}
          <button
            type="submit"
            className="rounded-full bg-[#2f6ea5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b]"
          >
            Search
          </button>
          {query && (
            <Link href={buildHref({ q: "" })} className="text-xs text-slate-400 hover:text-slate-700">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Provider grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.length === 0 ? (
          <p className="col-span-full text-center text-sm text-slate-400 py-10">No providers found.</p>
        ) : (
          providers.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.speciality || "—"}</p>
                  <p className="text-xs text-slate-400 truncate">{p.users[0]?.email || "—"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 flex gap-4 text-center text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{p._count.appointments}</div>
                  <div className="text-slate-400">Appts</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{p._count.slots}</div>
                  <div className="text-slate-400">Slots</div>
                </div>
                {p.defaultFeePaise && (
                  <div>
                    <div className="font-semibold text-slate-900">
                      ₹{Math.round(p.defaultFeePaise / 100)}
                    </div>
                    <div className="text-slate-400">Default fee</div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/slots?providerId=${p.id}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  Schedule slots
                </Link>
                <Link
                  href={`/admin/appointments?provider=${p.id}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  View appts
                </Link>
              </div>

              <ProviderStatusToggle providerId={p.id} initialActive={p.isActive} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
