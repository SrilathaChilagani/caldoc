import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import RxStatusAction from "./RxStatusAction";

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
  AWAITING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  DISPATCHED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminRxOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/rx-orders");

  const sp = await searchParams;
  const statusFilter = sp.status?.toUpperCase() || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 25;

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;

  const [orders, total, countsByStatus, revenueResult] = await Promise.all([
    prisma.rxOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.rxOrder.count({ where }),
    prisma.rxOrder.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.rxOrder.aggregate({ _sum: { amountPaise: true }, where: { status: { in: ["PAID", "PROCESSING", "DISPATCHED", "DELIVERED"] } } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const countsMap = new Map(countsByStatus.map((c) => [c.status, c._count.status]));

  const kpis = [
    { label: "Total orders", value: total },
    { label: "Revenue", value: formatINR(revenueResult._sum.amountPaise ?? 0) },
    { label: "Awaiting payment", value: countsMap.get("AWAITING_PAYMENT") ?? 0 },
    { label: "Paid", value: countsMap.get("PAID") ?? 0 },
    { label: "Dispatched", value: countsMap.get("DISPATCHED") ?? 0 },
    { label: "Delivered", value: countsMap.get("DELIVERED") ?? 0 },
  ];

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    const qs = params.toString();
    return `/admin/rx-orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Rx delivery</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and manage all prescription delivery orders.
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

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 self-center mr-1">Filter</span>
        {["", "AWAITING_PAYMENT", "PAID", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED"].map((s) => (
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

      {/* Table */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <p className="mb-4 text-sm text-slate-500">Showing {orders.length} of {total} orders</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {["Date", "Patient", "Phone", "Items", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const items = Array.isArray(order.items)
                    ? (order.items as Array<{ name?: string; qty?: number }>)
                        .map((i) => `${i.name ?? "Item"}${i.qty && i.qty > 1 ? ` ×${i.qty}` : ""}`)
                        .join(", ")
                    : "—";
                  return (
                    <tr key={order.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatIST(order.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-slate-900">{order.patientName || "—"}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{order.patientPhone || "—"}</td>
                      <td className="py-2.5 pr-4 max-w-[200px]">
                        <div className="truncate text-xs text-slate-600" title={items}>{items}</div>
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
                            href={`/admin/rx-orders/${order.id}`}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                          >
                            View
                          </Link>
                          <RxStatusAction orderId={order.id} currentStatus={order.status} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
