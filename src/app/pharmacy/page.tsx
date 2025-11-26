import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
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
  const pieces = [
    snapshot.line1,
    snapshot.line2,
    snapshot.city,
    snapshot.state,
    snapshot.postalCode,
  ]
    .map((part) => (part || "").trim())
    .filter(Boolean);
  if (!pieces.length) return null;
  return pieces.join(", ");
}

type FulfillmentStatus = "READY" | "PACKED" | "SHIPPED" | "DELIVERED" | "SENT";

const DELIVERY_FLOW: FulfillmentStatus[] = ["READY", "PACKED", "SHIPPED", "DELIVERED"];
const WHATSAPP_FLOW: FulfillmentStatus[] = ["READY", "SENT"];

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  READY: "Ready",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  SENT: "Sent to WhatsApp",
};

export default async function PharmacyDashboardPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/provider/login?next=/pharmacy");

  const appointments = await prisma.appointment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      provider: { select: { name: true, speciality: true } },
      patient: { select: { name: true, phone: true } },
      prescription: true,
      patientDocuments: true,
      pharmacyFulfillment: true,
    },
    take: 150,
  });

  const statusCounts: Record<FulfillmentStatus, number> = {
    READY: 0,
    PACKED: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    SENT: 0,
  };

  const appointmentRows = appointments.map((appt) => {
    const snapshot = (appt.deliveryAddressSnapshot as DeliverySnapshot | null) ?? null;
    const contactName = snapshot?.contactName || appt.patient?.name || "—";
    const contactPhone = snapshot?.contactPhone || appt.patient?.phone || "—";
    const isDelivery = appt.deliveryOpt === "DELIVERY";
    const delivery = isDelivery ? "Delivery" : "WhatsApp";
    const address = formatAddress(snapshot);
    const createdAtLabel = appt.createdAt
      .toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
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
      fulfillmentLabel: STATUS_LABELS[fulfillmentStatus],
      fulfillmentFlow: (isDelivery ? "DELIVERY" : "WHATSAPP") as "DELIVERY" | "WHATSAPP",
    };
  });

  const awaitingPrescription = appointments.filter((appt) => !appt.prescription?.pdfKey).length;

  return (
    <>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h1 className="text-2xl font-semibold text-slate-900">Pharmacy queue</h1>
        <p className="text-sm text-slate-500">
          Track every appointment with the information you need to pack and dispatch prescriptions.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Ready</p>
            <p className="text-2xl font-semibold text-slate-900">{statusCounts.READY}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">WhatsApp sent</p>
            <p className="text-2xl font-semibold text-slate-900">{statusCounts.SENT}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Packed</p>
            <p className="text-2xl font-semibold text-slate-900">{statusCounts.PACKED}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Shipped</p>
            <p className="text-2xl font-semibold text-slate-900">{statusCounts.SHIPPED}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Delivered</p>
            <p className="text-2xl font-semibold text-slate-900">{statusCounts.DELIVERED}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Waiting for Rx</p>
            <p className="text-2xl font-semibold text-slate-900">{awaitingPrescription}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent appointments</h2>
          <p className="text-xs text-slate-500">Showing the last {appointmentRows.length} bookings.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-[#eef3ff] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prescription</th>
              </tr>
            </thead>
            <tbody>
              {appointmentRows.map((appt) => {
                return (
                  <tr key={appt.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-500">
                      <div className="font-medium text-slate-900">{appt.createdAtLabel}</div>
                      <div className="text-xs text-slate-400">ID: {appt.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{appt.providerName}</div>
                      <div className="text-xs text-slate-500">{appt.providerSpeciality}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{appt.contactName}</div>
                      <div className="font-mono text-xs text-slate-500">{appt.contactPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {appt.delivery}
                      </span>
                      {appt.address ? (
                        <p className="mt-2 text-xs text-slate-500">{appt.address}</p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No address on file</p>
                      )}
                    {appt.deliveryInstructions && (
                      <p className="mt-1 text-xs text-amber-600">Note: {appt.deliveryInstructions}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        {appt.fulfillmentLabel}
                      </span>
                      <PharmacyFulfillmentActions
                        appointmentId={appt.id}
                        currentStatus={appt.fulfillmentStatus}
                        flow={appt.fulfillmentFlow}
                      />
                    </div>
                  </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="space-y-2">
                        {appt.prescription?.pdfKey ? (
                          <Link
                            href={`/api/appointments/${appt.id}/prescription.pdf`}
                            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300 hover:text-blue-900"
                          >
                            Download prescription
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Waiting on doctor</span>
                        )}

                        {appt.patientDocuments.length > 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Patient uploads
                            </p>
                            <ul className="mt-2 space-y-1">
                              {appt.patientDocuments.map((doc) => (
                                <li key={doc.id}>
                                  <Link
                                    href={`/api/provider/documents/${doc.id}`}
                                    target="_blank"
                                    className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                                  >
                                    {doc.fileName || "Attachment"}
                                  </Link>
                                  <span className="text-[11px] text-slate-400">
                                    {" "}
                                    · {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No patient uploads</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
