import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import LabStatusAction from "./LabStatusAction";

export const dynamic = "force-dynamic";

function formatIST(date: Date) {
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
  PENDING: "bg-slate-100 text-slate-600",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SAMPLE_COLLECTED: "bg-indigo-100 text-indigo-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  REPORTS_READY: "bg-teal-100 text-teal-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  SAMPLE_COLLECTED: "Sample collected",
  PROCESSING: "Processing",
  REPORTS_READY: "Reports ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type SearchParams = Promise<{ status?: string; page?: string; mode?: string }>;

export default async function AdminLabsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/labs");

  const sp = await searchParams;
  const statusFilter = sp.status?.toUpperCase() || "";
  const modeFilter = sp.mode?.toUpperCase() || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 25;

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (modeFilter) where.deliveryMode = modeFilter;

  const [orders, total, countsByStatus, revenueResult] = await Promise.all([
    prisma.labOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        appointment: {
          select: {
            id: true,
            patientName: true,
            patient: { select: { name: true, phone: true } },
          },
        },
      },
    }),
    prisma.labOrder.count({ where }),
    prisma.labOrder.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.labOrder.aggregate({
      _sum: { amountPaise: true },
      where: { status: { in: ["CONFIRMED", "SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY", "COMPLETED"] } },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const countsMap = new Map(countsByStatus.map((c) => [c.status, c._count.status]));

  const kpis = [
    { label: "Total orders", value: total },
    { label: "Revenue", value: formatINR(revenueResult._sum.amountPaise ?? 0) },
    { label: "Pending", value: (countsMap.get("PENDING") ?? 0) + (countsMap.get("AWAITING_PAYMENT") ?? 0) },
    { label: "Confirmed", value: countsMap.get("CONFIRMED") ?? 0 },
    { label: "Processing", value: (countsMap.get("SAMPLE_COLLECTED") ?? 0) + (countsMap.get("PROCESSING") ?? 0) },
    { label: "Reports ready", value: countsMap.get("REPORTS_READY") ?? 0 },
  ];

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (modeFilter) params.set("mode", modeFilter);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/labs${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Lab orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track lab test orders, update status, and manage patient results.
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
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Status</span>
          {["", "PENDING", "AWAITING_PAYMENT", "CONFIRMED", "SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY", "COMPLETED", "CANCELLED"].map((s) => (
            <Link
              key={s}
              href={buildHref({ status: s, page: "1" })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusFilter === s
                  ? "bg-[#2f6ea5] text-white"
                  : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              }`}
            >
              {s ? STATUS_LABELS[s] : "All"}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 w-full">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Mode</span>
          {[["", "All"], ["HOME", "Home visit"], ["LAB", "Lab visit"], ["COURIER", "Courier"]].map(([v, label]) => (
            <Link
              key={v}
              href={buildHref({ mode: v, page: "1" })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                modeFilter === v
                  ? "bg-[#2f6ea5] text-white"
                  : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <p className="mb-4 text-sm text-slate-500">Showing {orders.length} of {total} orders</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {["Date", "Patient", "Tests", "Mode", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No lab orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const tests = Array.isArray(order.tests)
                    ? (order.tests as Array<{ name?: string; qty?: number } | string>)
                        .map((t) => typeof t === "string" ? t : `${t.name ?? "Test"}${t.qty && t.qty > 1 ? ` ×${t.qty}` : ""}`)
                        .join(", ")
                    : "—";
                  const patientName = order.appointment?.patientName || order.appointment?.patient?.name || "—";
                  const patientPhone = order.appointment?.patient?.phone || "—";
                  return (
                    <tr key={order.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatIST(order.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-slate-900">{patientName}</div>
                        <div className="text-xs text-slate-400">{patientPhone}</div>
                      </td>
                      <td className="py-2.5 pr-4 max-w-[180px]">
                        <div className="truncate text-xs text-slate-600" title={tests}>{tests}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">
                        {order.deliveryMode || "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-sm font-semibold text-slate-900">
                        {formatINR(order.amountPaise ?? 0)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/labs/${order.id}`}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                          >
                            View
                          </Link>
                          {order.appointment?.id && (
                            <Link
                              href={`/provider/appointments/${order.appointment.id}?from=admin`}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                            >
                              Visit
                            </Link>
                          )}
                          <LabStatusAction orderId={order.id} currentStatus={order.status} />
                        </div>
                      </td>
                    </tr>
                  );
                })
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
