import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import AdminAppointmentActions from "./AdminAppointmentActions";
import AdminAppointmentFilters from "./AdminAppointmentFilters";

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
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
  CANCELED: "bg-red-100 text-red-700",
  RESCHEDULED: "bg-blue-100 text-blue-700",
  NO_SHOW: "bg-slate-100 text-slate-600",
  COMPLETED: "bg-teal-100 text-teal-700",
};

type SearchParams = Promise<{ status?: string; provider?: string; page?: string }>;

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/appointments");

  const sp = await searchParams;
  const statusFilter = sp.status?.toUpperCase() || "";
  const providerFilter = sp.provider || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 25;

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (providerFilter) where.providerId = providerFilter;

  const [appointments, total, activeProviders, counts] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        provider: { select: { name: true, speciality: true } },
        patient: { select: { name: true, phone: true } },
        slot: { select: { startsAt: true } },
      },
    }),
    prisma.appointment.count({ where }),
    prisma.provider.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const countsMap = new Map(counts.map((c) => [c.status, c._count.status]));

  const kpis = [
    { label: "Total", value: counts.reduce((s, c) => s + c._count.status, 0), color: "text-slate-900" },
    { label: "Confirmed", value: (countsMap.get("CONFIRMED") ?? 0), color: "text-emerald-700" },
    { label: "Pending", value: (countsMap.get("PENDING") ?? 0), color: "text-amber-700" },
    { label: "Cancelled", value: (countsMap.get("CANCELLED") ?? 0) + (countsMap.get("CANCELED") ?? 0), color: "text-red-700" },
    { label: "Rescheduled", value: (countsMap.get("RESCHEDULED") ?? 0), color: "text-[#2f6ea5]" },
    { label: "No-show", value: (countsMap.get("NO_SHOW") ?? 0), color: "text-slate-500" },
  ];

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (providerFilter) params.set("provider", providerFilter);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/appointments${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">All appointments</h1>
        <p className="mt-1 text-sm text-slate-500">
          View, cancel, or reassign any appointment across all providers.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <AdminAppointmentFilters
          statusFilter={statusFilter}
          providerFilter={providerFilter}
          providers={activeProviders}
        />
      </div>

      {/* Table */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            Showing {appointments.length} of {total} appointments
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {["Slot time", "Patient", "Provider", "Mode", "Status", "Actions"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No appointments match this filter.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatIST(appt.slot?.startsAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-900">{appt.patientName || appt.patient?.name || "—"}</div>
                      <div className="text-xs text-slate-400">{appt.patient?.phone ?? "—"}</div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-900">{appt.provider?.name ?? "—"}</div>
                      <div className="text-xs text-slate-400">{appt.provider?.speciality ?? ""}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {appt.visitMode === "AUDIO" ? "Audio" : "Video"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_COLORS[appt.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/provider/appointments/${appt.id}?from=admin`}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                        >
                          View
                        </Link>
                        <AdminAppointmentActions
                          appointmentId={appt.id}
                          currentStatus={appt.status}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref({ page: String(page - 1) })}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                ← Prev
              </Link>
            )}
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
