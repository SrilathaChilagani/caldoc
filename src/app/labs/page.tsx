import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireLabsSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import { validateAddress } from "@/lib/validateAddress";
import LabOrderActions from "./LabOrderActions";
import UploadResultsButton from "./UploadResultsButton";

export const dynamic = "force-dynamic";

function formatIST(date: Date) {
  return date
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\u202f/g, " ");
}

function formatAddress(addr: Record<string, unknown> | null | undefined) {
  if (!addr) return null;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
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

const MODE_LABELS: Record<string, string> = {
  HOME: "🏠 Home visit",
  LAB: "🔬 Lab visit",
  COURIER: "📦 Courier",
};

export default async function LabsDashboardPage() {
  const sess = await requireLabsSession();
  if (!sess) redirect("/labs/login?next=/labs");

  const partnerFilter = sess.labPartnerId ? { labPartnerId: sess.labPartnerId } : {};
  const orders = await prisma.labOrder.findMany({
    where: partnerFilter,
    orderBy: { createdAt: "desc" },
    include: {
      appointment: {
        select: {
          id: true,
          provider: { select: { name: true, speciality: true } },
        },
      },
      patient: { select: { name: true, phone: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 200,
  });

  // KPI counts using updated status labels
  const counts: Record<string, number> = {};
  for (const order of orders) {
    const s = order.status || "PENDING";
    counts[s] = (counts[s] || 0) + 1;
  }

  const kpis = [
    { label: "Total", value: orders.length, color: "text-slate-900" },
    { label: "Pending", value: (counts.PENDING || 0) + (counts.AWAITING_PAYMENT || 0), color: "text-amber-700" },
    { label: "Confirmed", value: counts.CONFIRMED || 0, color: "text-blue-700" },
    { label: "Sample collected", value: counts.SAMPLE_COLLECTED || 0, color: "text-indigo-700" },
    { label: "Processing", value: counts.PROCESSING || 0, color: "text-violet-700" },
    { label: "Reports ready", value: counts.REPORTS_READY || 0, color: "text-teal-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Header + KPIs */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">Labs queue</h1>
            <p className="text-sm text-slate-500">
              Track lab orders, assign collection agents, and manage results.
            </p>
          </div>
          <form action="/labs/logout" method="post">
            <input type="hidden" name="next" value="/labs/login" />
            <button
              type="submit"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            >
              Log out
            </button>
          </form>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Orders table */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-slate-900">Lab orders</h2>
          <p className="text-xs text-slate-500">Showing {orders.length} orders</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Tests</th>
                <th className="pb-2 pr-4">Patient</th>
                <th className="pb-2 pr-4">Mode &amp; Address</th>
                <th className="pb-2 pr-4">Agent</th>
                <th className="pb-2 pr-4">Doctor</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No lab orders found.</td>
                </tr>
              )}
              {orders.map((order) => {
                const patientName = order.patientName || order.patient?.name || "—";
                const patientPhone = order.patientPhone || order.patient?.phone || "—";
                const addr = order.address as Record<string, unknown> | null;
                const addrStr = formatAddress(addr);
                const needsAddress = order.deliveryMode === "HOME" || order.deliveryMode === "COURIER";
                const addrIssues = needsAddress
                  ? validateAddress(addr as Parameters<typeof validateAddress>[0])
                  : [];

                const tests = Array.isArray(order.tests)
                  ? (order.tests as Array<{ name?: string; qty?: number } | string>)
                  : [];

                const lastNote = order.events[0]?.note;

                return (
                  <tr key={order.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="py-3 pr-4">
                      <div className="text-xs font-medium text-slate-900">{formatIST(order.createdAt)}</div>
                      <div className="font-mono text-[10px] text-slate-400">{order.id.slice(-8)}</div>
                      {order.notes && (
                        <p className="mt-0.5 text-[10px] text-slate-500 italic">{order.notes}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 max-w-[160px]">
                      {tests.length > 0 ? (
                        <ul className="space-y-0.5">
                          {tests.slice(0, 4).map((t, idx) => {
                            const name = typeof t === "string" ? t : (t.name ?? "Test");
                            const qty = typeof t === "object" && t.qty && t.qty > 1 ? ` ×${t.qty}` : "";
                            return (
                              <li key={idx} className="text-xs text-slate-700">
                                • {name}{qty}
                              </li>
                            );
                          })}
                          {tests.length > 4 && (
                            <li className="text-[10px] text-slate-400">+{tests.length - 4} more</li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No tests</p>
                      )}
                      {order.amountPaise && (
                        <p className="mt-1 text-xs font-semibold text-slate-700">{formatINR(order.amountPaise)}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{patientName}</div>
                      <div className="font-mono text-xs text-slate-500">{patientPhone}</div>
                      {order.patientEmail && (
                        <div className="text-[10px] text-slate-400">{order.patientEmail}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 max-w-[160px]">
                      {order.deliveryMode && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {MODE_LABELS[order.deliveryMode] ?? order.deliveryMode}
                        </span>
                      )}
                      {addrStr && (
                        <p className="mt-1.5 text-[11px] text-slate-500">{addrStr}</p>
                      )}
                      {addrIssues.length > 0 && (
                        <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                          <p className="text-[10px] font-semibold text-amber-700">Address issues</p>
                          {addrIssues.slice(0, 2).map((issue) => (
                            <p key={issue.field} className="text-[10px] text-amber-600">• {issue.message}</p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {order.collectionAgentName || order.collectionAgentPhone ? (
                        <div>
                          {order.collectionAgentName && (
                            <p className="text-xs font-medium text-indigo-700">{order.collectionAgentName}</p>
                          )}
                          {order.collectionAgentPhone && (
                            <p className="font-mono text-xs text-indigo-600">{order.collectionAgentPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not assigned</span>
                      )}
                      {lastNote && (
                        <p className="mt-1 text-[10px] text-slate-400 italic">{lastNote}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{order.appointment?.provider?.name ?? "—"}</div>
                      <div className="text-xs text-slate-500">{order.appointment?.provider?.speciality ?? ""}</div>
                      {order.appointment?.id && (
                        <Link
                          href={`/provider/appointments/${order.appointment.id}?from=admin`}
                          className="text-[11px] font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                        >
                          View visit →
                        </Link>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="space-y-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <LabOrderActions
                          orderId={order.id}
                          currentStatus={order.status}
                          collectionAgentName={order.collectionAgentName}
                          collectionAgentPhone={order.collectionAgentPhone}
                        />
                        {["PROCESSING", "SAMPLE_COLLECTED"].includes(order.status) && (
                          <UploadResultsButton orderId={order.id} />
                        )}
                        <Link
                          href={`/admin/labs/${order.id}`}
                          className="block text-[11px] font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                        >
                          Full timeline →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
