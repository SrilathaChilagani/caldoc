import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RxOrderActions from "./RxOrderActions";

export const dynamic = "force-dynamic";

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short",
  year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
});

const STATUS_CHIP: Record<string, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  PAID:             "bg-blue-50 text-blue-700",
  PROCESSING:       "bg-violet-50 text-violet-700",
  DISPATCHED:       "bg-sky-50 text-sky-700",
  DELIVERED:        "bg-emerald-100 text-emerald-800",
  CANCELLED:        "bg-rose-50 text-rose-600",
};

const STATUSES = ["ALL","AWAITING_PAYMENT","PAID","PROCESSING","DISPATCHED","DELIVERED","CANCELLED"];

type PageProps = { searchParams?: Promise<{ [key: string]: string | undefined }> };

export default async function FrontDeskRxOrders({ searchParams }: PageProps) {
  const sess = await requireFrontDeskSession();
  if (!sess) redirect("/frontdesk/login");

  const sp = (await searchParams) ?? {};
  const statusFilter  = (sp.status || "ALL").toUpperCase();
  const partnerFilter = sp.partner || "";

  const [pharmacyPartners, orders] = await Promise.all([
    prisma.pharmacyPartner.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.rxOrder.findMany({
      where: {
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(partnerFilter === "UNASSIGNED" ? { pharmacyPartnerId: null } : partnerFilter ? { pharmacyPartnerId: partnerFilter } : {}),
      },
      include: { pharmacyPartner: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  function mkHref(p: Record<string, string>) {
    const params = new URLSearchParams({ ...(statusFilter !== "ALL" ? { status: statusFilter } : {}), ...(partnerFilter ? { partner: partnerFilter } : {}), ...p });
    const s = params.toString();
    return s ? `/frontdesk/rx-orders?${s}` : "/frontdesk/rx-orders";
  }

  function fmtItems(items: unknown): string {
    if (!items) return "—";
    if (Array.isArray(items)) return items.map((i: unknown) => typeof i === "object" && i !== null ? (i as Record<string,unknown>).name ?? JSON.stringify(i) : String(i)).join(", ");
    return String(items);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold text-slate-900">Pharmacy / Rx orders</h1>

      {/* Filters */}
      <div className="rounded-2xl border border-white/70 bg-white/90 px-5 py-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {STATUSES.map(s => (
            <Link key={s} href={mkHref({status:s==="ALL"?"":s})}
              className={`rounded-full px-3 py-1 uppercase tracking-wide ${(statusFilter||"ALL")===s?"bg-slate-900 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s==="ALL"?"All":s.replace(/_/g," ").toLowerCase()}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Pharmacy:</span>
          <Link href={mkHref({partner:""})} className={`rounded-full px-3 py-1 text-xs font-medium ${!partnerFilter?"bg-[#2f6ea5] text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All</Link>
          <Link href={mkHref({partner:"UNASSIGNED"})} className={`rounded-full px-3 py-1 text-xs font-medium ${partnerFilter==="UNASSIGNED"?"bg-[#2f6ea5] text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Unassigned</Link>
          {pharmacyPartners.map(p=>(
            <Link key={p.id} href={mkHref({partner:p.id})} className={`rounded-full px-3 py-1 text-xs font-medium ${partnerFilter===p.id?"bg-[#2f6ea5] text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p.name}</Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Pharmacy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No Rx orders found.</td></tr>
              )}
              {orders.map(o => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-xs text-slate-500">{IST.format(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.patientName || "—"}</div>
                    <div className="text-xs text-slate-400">{o.patientPhone}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="truncate text-xs">{fmtItems(o.items)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">₹{(o.amountPaise/100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {o.pharmacyPartner
                      ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{o.pharmacyPartner.name}</span>
                      : <span className="text-xs text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {o.status.replace(/_/g," ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RxOrderActions
                      orderId={o.id}
                      currentStatus={o.status}
                      currentPharmacyPartnerId={o.pharmacyPartnerId ?? null}
                      pharmacyPartners={pharmacyPartners}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-slate-400">Showing up to 200 Rx orders.</p>
      </div>
    </div>
  );
}
