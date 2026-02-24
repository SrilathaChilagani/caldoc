import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePharmacySession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import { validateAddress } from "@/lib/validateAddress";
import PharmacyFulfillmentActions from "./PharmacyFulfillmentActions";

export const dynamic = "force-dynamic";

type DeliverySnapshot = {
  label?: string;
  contactName?: string;
  contactPhone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  instructions?: string;
};

function formatAddress(snapshot: DeliverySnapshot | null) {
  if (!snapshot) return null;
  const pieces = [snapshot.line1, snapshot.line2, snapshot.city, snapshot.state, snapshot.postalCode]
    .map((part) => (part || "").trim())
    .filter(Boolean);
  if (!pieces.length) return null;
  return pieces.join(", ");
}

function formatJsonAddress(address: Record<string, unknown> | null | undefined) {
  if (!address) return "";
  const parts = [address.line1, address.line2, address.city, address.state, address.postalCode]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function summarizeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => `${item?.name || "medicine"} × ${item?.qty || 1}`);
}

type FulfillmentStatus = "READY" | "PACKED" | "SHIPPED" | "DELIVERED" | "SENT";

const DELIVERY_FLOW: FulfillmentStatus[] = ["READY", "PACKED", "SHIPPED", "DELIVERED"];
const WHATSAPP_FLOW: FulfillmentStatus[] = ["READY", "SENT"];

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  READY: "Ready",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  SENT: "Sent to WhatsApp",
};

const RX_STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  DISPATCHED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const RX_STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function PharmacyDashboardPage() {
  const sess = await requirePharmacySession();
  if (!sess) redirect("/pharmacy/login?next=/pharmacy");

  const [appointments, rxOrders] = await Promise.all([
    prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        provider: { select: { name: true, speciality: true } },
        patient: { select: { name: true, phone: true } },
        prescription: true,
        patientDocuments: true,
        pharmacyFulfillment: true,
      },
      take: 150,
    }),
    prisma.rxOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const statusCounts: Record<FulfillmentStatus, number> = {
    READY: 0, PACKED: 0, SHIPPED: 0, DELIVERED: 0, SENT: 0,
  };

  const appointmentRows = appointments.map((appt) => {
    const snapshot = (appt.deliveryAddressSnapshot as DeliverySnapshot | null) ?? null;
    const contactName = snapshot?.contactName || appt.patientName || appt.patient?.name || "—";
    const contactPhone = snapshot?.contactPhone || appt.patient?.phone || "—";
    const isDelivery = appt.deliveryOpt === "DELIVERY";
    const delivery = isDelivery ? "Delivery" : "WhatsApp";
    const address = formatAddress(snapshot);
    const createdAtLabel = appt.createdAt
      .toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\u202f/g, " ");
    const rawStatus = (appt.pharmacyFulfillment?.status || "READY").toUpperCase() as FulfillmentStatus;
    const allowedFlow = isDelivery ? DELIVERY_FLOW : WHATSAPP_FLOW;
    const fulfillmentStatus = allowedFlow.includes(rawStatus) ? rawStatus : allowedFlow[0];
    if (statusCounts[fulfillmentStatus] !== undefined) statusCounts[fulfillmentStatus] += 1;
    return {
      id: appt.id,
      createdAtLabel,
      providerName: appt.provider?.name ?? "—",
      providerSpeciality: appt.provider?.speciality ?? "—",
      contactName,
      contactPhone,
      delivery,
      address,
      deliveryInstructions: snapshot?.instructions || null,
      prescription: appt.prescription,
      patientDocuments: appt.patientDocuments,
      fulfillmentStatus,
      fulfillmentLabel: FULFILLMENT_LABELS[fulfillmentStatus],
      fulfillmentFlow: (isDelivery ? "DELIVERY" : "WHATSAPP") as "DELIVERY" | "WHATSAPP",
      canUpdateStatus: Boolean(appt.prescription?.pdfKey),
    };
  });

  const awaitingPrescription = appointments.filter((appt) => !appt.prescription?.pdfKey).length;

  // KPIs for Rx orders
  const rxKpis = {
    total: rxOrders.length,
    awaitingPayment: rxOrders.filter((o) => o.status === "AWAITING_PAYMENT").length,
    paid: rxOrders.filter((o) => o.status === "PAID").length,
    processing: rxOrders.filter((o) => o.status === "PROCESSING").length,
    dispatched: rxOrders.filter((o) => o.status === "DISPATCHED").length,
    delivered: rxOrders.filter((o) => o.status === "DELIVERED").length,
  };

  return (
    <>
      {/* Appointment fulfillment section */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Pharmacy queue</h1>
        <p className="text-sm text-slate-500">
          Track every appointment with the information you need to pack and dispatch prescriptions.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { label: "Ready", value: statusCounts.READY },
            { label: "WhatsApp sent", value: statusCounts.SENT },
            { label: "Packed", value: statusCounts.PACKED },
            { label: "Shipped", value: statusCounts.SHIPPED },
            { label: "Delivered", value: statusCounts.DELIVERED },
            { label: "Waiting for Rx", value: awaitingPrescription },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-white/70 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-slate-900">Recent appointments</h2>
          <p className="text-xs text-slate-500">Showing the last {appointmentRows.length} bookings.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">Provider</th>
                <th className="pb-2 pr-4">Patient</th>
                <th className="pb-2 pr-4">Delivery</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Prescription</th>
              </tr>
            </thead>
            <tbody>
              {appointmentRows.map((appt) => (
                <tr key={appt.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-4 text-xs text-slate-400">
                    <div className="font-medium text-slate-900">{appt.createdAtLabel}</div>
                    <div className="font-mono text-[10px]">{appt.id.slice(-8)}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">{appt.providerName}</div>
                    <div className="text-xs text-slate-500">{appt.providerSpeciality}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">{appt.contactName}</div>
                    <div className="font-mono text-xs text-slate-500">{appt.contactPhone}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {appt.delivery}
                    </span>
                    {appt.address ? (
                      <p className="mt-1.5 text-xs text-slate-500">{appt.address}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-400">No address</p>
                    )}
                    {appt.deliveryInstructions && (
                      <p className="mt-1 text-xs text-amber-600">Note: {appt.deliveryInstructions}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="space-y-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {appt.fulfillmentLabel}
                      </span>
                      <PharmacyFulfillmentActions
                        appointmentId={appt.id}
                        currentStatus={appt.fulfillmentStatus}
                        flow={appt.fulfillmentFlow}
                        canUpdate={appt.canUpdateStatus}
                      />
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="space-y-2">
                      {appt.prescription?.pdfKey ? (
                        <Link
                          href={`/api/appointments/${appt.id}/prescription.pdf`}
                          className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-[#2f6ea5] hover:border-[#2f6ea5]"
                        >
                          Download Rx
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Waiting on doctor</span>
                      )}
                      {appt.patientDocuments.length > 0 && (
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Patient uploads
                          </p>
                          <ul className="mt-1 space-y-1">
                            {appt.patientDocuments.map((doc) => (
                              <li key={doc.id}>
                                <Link
                                  href={`/api/provider/documents/${doc.id}`}
                                  target="_blank"
                                  className="text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                                >
                                  {doc.fileName || "Attachment"}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ad-hoc Rx orders with supply chain tracking */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">Ad-hoc Rx delivery orders</h2>
            <p className="text-sm text-slate-500">Patient-submitted prescription delivery orders with supply chain tracking.</p>
          </div>
          <p className="text-xs text-slate-500">Showing {rxOrders.length} orders</p>
        </div>

        {/* Rx KPI strip */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: rxKpis.total, color: "text-slate-900" },
            { label: "Awaiting payment", value: rxKpis.awaitingPayment, color: "text-amber-700" },
            { label: "Paid", value: rxKpis.paid, color: "text-blue-700" },
            { label: "Processing", value: rxKpis.processing, color: "text-violet-700" },
            { label: "Dispatched", value: rxKpis.dispatched, color: "text-indigo-700" },
            { label: "Delivered", value: rxKpis.delivered, color: "text-emerald-700" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
              <p className={`mt-0.5 text-xl font-semibold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Patient</th>
                <th className="pb-2 pr-4">Items</th>
                <th className="pb-2 pr-4">Address</th>
                <th className="pb-2 pr-4">Tracking</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rxOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-400">No Rx delivery orders yet.</td>
                </tr>
              ) : (
                rxOrders.map((order) => {
                  const addr = order.address as Record<string, unknown> | null;
                  const addrStr = formatJsonAddress(addr);
                  const addrIssues = validateAddress(addr as Parameters<typeof validateAddress>[0]);
                  const items = summarizeItems(order.items);
                  const lastEvent = order.events[0];
                  return (
                    <tr key={order.id} className="border-b border-slate-50 last:border-0 align-top">
                      <td className="py-3 pr-4">
                        <div className="text-xs font-medium text-slate-900">
                          {order.createdAt.toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).replace(/\u202f/g, " ")}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{order.id.slice(-8)}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{order.patientName}</div>
                        <div className="text-xs text-slate-500">{order.patientPhone}</div>
                      </td>
                      <td className="py-3 pr-4 max-w-[160px]">
                        <ul className="space-y-0.5 text-xs text-slate-600">
                          {items.slice(0, 3).map((label, i) => <li key={i}>• {label}</li>)}
                          {items.length > 3 && <li className="text-slate-400">+{items.length - 3} more</li>}
                        </ul>
                      </td>
                      <td className="py-3 pr-4 max-w-[180px]">
                        {addrStr ? (
                          <p className="text-xs text-slate-600">{addrStr}</p>
                        ) : (
                          <p className="text-xs text-slate-400">No address</p>
                        )}
                        {addrIssues.length > 0 && (
                          <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                            <p className="text-[10px] font-semibold text-amber-700">Address issues</p>
                            {addrIssues.slice(0, 2).map((issue) => (
                              <p key={issue.field} className="text-[10px] text-amber-600">• {issue.message}</p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {order.trackingNumber ? (
                          <div>
                            {order.courierName && (
                              <p className="text-xs font-medium text-indigo-700">{order.courierName}</p>
                            )}
                            <p className="font-mono text-xs text-indigo-900">{order.trackingNumber}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        {lastEvent?.note && (
                          <p className="mt-1 text-[10px] text-slate-500 italic">{lastEvent.note}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm font-semibold text-slate-900">
                        {formatINR(order.amountPaise ?? 0)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${RX_STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {RX_STATUS_LABELS[order.status] ?? order.status}
                          </span>
                          <Link
                            href={`/admin/rx-orders/${order.id}`}
                            className="text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                          >
                            Manage →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
