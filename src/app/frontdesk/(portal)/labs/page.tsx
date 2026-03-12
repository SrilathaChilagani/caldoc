import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LabOrderActions from "./LabOrderActions";

export const dynamic = "force-dynamic";

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short",
  year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
});

const STATUS_CHIP: Record<string, string> = {
  PENDING:          "bg-slate-100 text-slate-600",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  CONFIRMED:        "bg-blue-50 text-blue-700",
  SAMPLE_COLLECTED: "bg-sky-50 text-sky-700",
  PROCESSING:       "bg-violet-50 text-violet-700",
  REPORTS_READY:    "bg-emerald-50 text-emerald-700",
  COMPLETED:        "bg-emerald-100 text-emerald-800",
  CANCELLED:        "bg-rose-50 text-rose-600",
};

const STATUSES = ["ALL","PENDING","AWAITING_PAYMENT","CONFIRMED","SAMPLE_COLLECTED","PROCESSING","REPORTS_READY","COMPLETED","CANCELLED"];

type PageProps = { searchParams?: Promise<{ [key: string]: string | undefined }> };

export default async function FrontDeskLabs({ searchParams }: PageProps) {
  const sess = await requireFrontDeskSession();
  if (!sess) redirect("/frontdesk/login");

  const sp = (await searchParams) ?? {};
  const statusFilter = (sp.status || "ALL").toUpperCase();
  const partnerFilter = sp.partner || "";

  const [labPartners, orders] = await Promise.all([
    prisma.labPartner.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.labOrder.findMany({
      where: {
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(partnerFilter === "UNASSIGNED" ? { labPartnerId: null } : partnerFilter ? { labPartnerId: partnerFilter } : {}),
      },
      include: { labPartner: { select: { id: true, name: true } }, appointment: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  function mkHref(p: Record<string, string>) {
    const params = new URLSearchParams({ ...(statusFilter !== "ALL" ? { status: statusFilter } : {}), ...(partnerFilter ? { partner: partnerFilter } : {}), ...p });
    const s = params.toString();
    return s ? `/frontdesk/labs?${s}` : "/frontdesk/labs";
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold text-slate-900">Lab orders</h1>

      {/* Filters */}
      <div className="rounded-2xl border border-white/70 bg-white/90 px-5 py-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {STATUSES.map(s => (
            <Link key={s} href={mkHref({status: s==="ALL"?"":s})}
              className={`rounded-full px-3 py-1 uppercase tracking-wide ${(statusFilter||"ALL")===s?"bg-slate-900 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s==="ALL"?"All":s.replace(/_/g," ").toLowerCase()}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Lab partner:</span>
          <Link href={mkHref({partner:""})} className={`rounded-full px-3 py-1 text-xs font-medium ${!partnerFilter?"bg-[#2f6ea5] text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All</Link>
          <Link href={mkHref({partner:"UNASSIGNED"})} className={`rounded-full px-3 py-1 text-xs font-medium ${partnerFilter==="UNASSIGNED"?"bg-[#2f6ea5] text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Unassigned</Link>
          {labPartners.map(p=>(
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
                <th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Lab partner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No lab orders found.</td></tr>
              )}
              {orders.map(o => {
                const tests = Array.isArray(o.tests) ? (o.tests as string[]).join(", ") : String(o.tests || "—");
                return (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-xs text-slate-500">{IST.format(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.patientName || "—"}</div>
                      <div className="text-xs text-slate-400">{o.patientPhone}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate text-xs">{tests}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{o.deliveryMode || "—"}</td>
                    <td className="px-4 py-3">
                      {o.labPartner
                        ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{o.labPartner.name}</span>
                        : <span className="text-xs text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {o.status.replace(/_/g," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <LabOrderActions
                        orderId={o.id}
                        currentStatus={o.status}
                        currentLabPartnerId={o.labPartnerId ?? null}
                        labPartners={labPartners}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-slate-400">Showing up to 200 lab orders.</p>
      </div>
    </div>
  );
}
