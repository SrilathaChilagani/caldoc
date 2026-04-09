import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import AdminNgoReservationActions from "../AdminNgoReservationActions";
import AdminNgoFilters from "./AdminNgoFilters";

export const dynamic = "force-dynamic";

function formatIST(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<string, string> = {
  HELD: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  INVOICE_REQUESTED: "bg-blue-100 text-blue-700",
  RELEASED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-100 text-red-700",
};

type SearchParams = Promise<{ status?: string; ngo?: string; page?: string }>;

export default async function AdminNgoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/ngo");

  const sp = await searchParams;
  const statusFilter = sp.status?.toUpperCase() || "";
  const ngoFilter = sp.ngo || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 25;

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (ngoFilter) where.ngoId = ngoFilter;

  const [reservations, total, countsByStatus, ngos, revenueResult] = await Promise.all([
    prisma.ngoReservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        ngo: { select: { id: true, name: true } },
        provider: { select: { name: true, speciality: true } },
        slot: { select: { startsAt: true } },
      },
    }),
    prisma.ngoReservation.count({ where }),
    prisma.ngoReservation.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.ngo.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.ngoReservation.aggregate({
      _sum: { amountPaise: true },
      where: { status: { in: ["CONFIRMED", "INVOICE_REQUESTED"] } },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const countsMap = new Map(countsByStatus.map((c) => [c.status, c._count.status]));

  const kpis = [
    { label: "Total bookings", value: total },
    { label: "Revenue", value: formatINR(revenueResult._sum.amountPaise ?? 0) },
    { label: "Held", value: countsMap.get("HELD") ?? 0 },
    { label: "Confirmed", value: countsMap.get("CONFIRMED") ?? 0 },
    { label: "Invoice requested", value: countsMap.get("INVOICE_REQUESTED") ?? 0 },
    { label: "Released", value: countsMap.get("RELEASED") ?? 0 },
  ];

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (ngoFilter) params.set("ngo", ngoFilter);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/ngo${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">NGO bookings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Confirm NGO slot reservations, release holds, and manage invoicing.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <AdminNgoFilters
          statusFilter={statusFilter}
          ngoFilter={ngoFilter}
          ngos={ngos}
        />
      </div>

      {/* Table */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <p className="mb-4 text-sm text-slate-500">Showing {reservations.length} of {total} reservations</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {["ID", "NGO", "Doctor", "Slot", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No reservations found.</td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {r.friendlyId}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{r.ngo?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-900">{r.provider.name}</div>
                      <div className="text-xs text-slate-400">{r.provider.speciality}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500 whitespace-nowrap">
                      {r.slot?.startsAt ? formatIST(r.slot.startsAt) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-sm font-semibold text-slate-900">
                      {r.amountPaise ? formatINR(r.amountPaise) : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <AdminNgoReservationActions
                        reservationId={r.id}
                        status={r.status}
                        friendlyId={r.friendlyId}
                        amountPaise={r.amountPaise}
                        notes={r.notes}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={buildHref({ page: String(page - 1) })} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                ← Prev
              </Link>
            )}
            <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={buildHref({ page: String(page + 1) })} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                Next →
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
