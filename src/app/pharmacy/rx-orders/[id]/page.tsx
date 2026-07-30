import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePharmacySession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import { validateAddress, formatAddress } from "@/lib/validateAddress";
import RxOrderActions from "./RxOrderActions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

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
  AWAITING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  DISPATCHED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid — ready to process",
  PROCESSING: "Processing",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_ICONS: Record<string, string> = {
  AWAITING_PAYMENT: "💳",
  PAID: "✅",
  PROCESSING: "📦",
  DISPATCHED: "🚚",
  DELIVERED: "🏠",
  CANCELLED: "❌",
};

const NEXT_STEPS: Record<string, string> = {
  PAID: "Start packing medicines and mark as Processing.",
  PROCESSING: "Once packed and handed to courier, mark as Dispatched and add tracking details.",
  DISPATCHED: "Once the patient has received the package, mark as Delivered.",
  DELIVERED: "Order complete.",
  CANCELLED: "This order was cancelled.",
  AWAITING_PAYMENT: "Waiting for patient payment — no action needed yet.",
};

export default async function PharmacyRxOrderDetailPage({ params }: PageProps) {
  const sess = await requirePharmacySession();
  if (!sess) redirect("/pharmacy/login?next=/pharmacy");

  const { id } = await params;

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  // Partner-scoped access control
  if (sess.pharmacyPartnerId && order.pharmacyPartnerId !== sess.pharmacyPartnerId) {
    notFound();
  }

  const address = order.address as Record<string, unknown> | null;
  const addressIssues = validateAddress(address as Parameters<typeof validateAddress>[0]);
  const formattedAddress = formatAddress(address);
  const items = Array.isArray(order.items)
    ? (order.items as Array<{ name?: string; qty?: number; price?: number }>)
    : [];

  const canUpdate = order.status === "PAID" || order.status === "PROCESSING" || order.status === "DISPATCHED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/pharmacy"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-slate-900">Rx delivery order</h1>
          <p className="font-mono text-xs text-slate-400">{order.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {/* Next-step hint */}
      {NEXT_STEPS[order.status] && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">Next step: </span>{NEXT_STEPS[order.status]}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: patient, address, items, timeline */}
        <div className="space-y-6 lg:col-span-2">

          {/* Patient */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Patient</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{order.patientName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                <dd className="mt-0.5 text-slate-900">{order.patientPhone}</dd>
              </div>
              {order.patientEmail && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
                  <dd className="mt-0.5 text-slate-900">{order.patientEmail}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ordered</dt>
                <dd className="mt-0.5 text-slate-900">{formatIST(order.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {/* Delivery address */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Delivery address</h2>
            {addressIssues.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700">Address warnings</p>
                <ul className="mt-1 space-y-1">
                  {addressIssues.map((issue) => (
                    <li key={issue.field} className="text-xs text-amber-600">
                      • <span className="capitalize font-medium">{issue.field}</span>: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {formattedAddress ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                {!!address?.line1 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Street</dt>
                    <dd className="mt-0.5 text-slate-900">
                      {String(address.line1)}
                      {address.line2 ? `, ${String(address.line2)}` : ""}
                    </dd>
                  </div>
                )}
                {!!address?.city && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">City</dt>
                    <dd className="mt-0.5 text-slate-900">{String(address.city)}</dd>
                  </div>
                )}
                {!!address?.state && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">State</dt>
                    <dd className="mt-0.5 text-slate-900">{String(address.state)}</dd>
                  </div>
                )}
                {!!address?.postalCode && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">PIN</dt>
                    <dd className="mt-0.5 text-slate-900">{String(address.postalCode)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No address recorded.</p>
            )}
            {order.trackingNumber && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold text-indigo-700">Tracking info</p>
                <p className="mt-1 text-sm text-indigo-900">
                  {order.courierName && <span className="font-medium">{order.courierName} — </span>}
                  {order.trackingNumber}
                </p>
              </div>
            )}
          </section>

          {/* Items */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Medicine items</h2>
              <span className="text-sm font-semibold text-slate-900">{formatINR(order.amountPaise)}</span>
            </div>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No items recorded.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <span className="font-medium text-slate-900">{item.name ?? "Item"}</span>
                      {item.qty && item.qty > 1 && (
                        <span className="ml-2 text-xs text-slate-500">×{item.qty}</span>
                      )}
                    </div>
                    {item.price && (
                      <span className="text-slate-600">{formatINR(item.price)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {order.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold">Patient note: </span>{order.notes}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Order timeline</h2>
            <p className="text-sm text-slate-500">All status updates for this order.</p>
            {order.events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No events yet.</p>
            ) : (
              <ol className="relative mt-6 ml-3 border-l border-slate-200">
                {order.events.map((event) => (
                  <li key={event.id} className="mb-6 ml-5">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm ring-2 ring-slate-200">
                      {STATUS_ICONS[event.toStatus] ?? "•"}
                    </span>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.fromStatus && (
                          <>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[event.fromStatus] ?? "bg-slate-100 text-slate-600"}`}>
                              {STATUS_LABELS[event.fromStatus] ?? event.fromStatus}
                            </span>
                            <span className="text-xs text-slate-400">→</span>
                          </>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[event.toStatus] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[event.toStatus] ?? event.toStatus}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">
                        {formatIST(event.createdAt)}
                        {event.actorEmail && (
                          <span className="ml-2 text-slate-500">by {event.actorEmail}</span>
                        )}
                      </p>
                      {(event.courierName || event.trackingNumber) && (
                        <p className="mt-1.5 text-xs text-indigo-700">
                          🚚 {event.courierName && <span className="font-medium">{event.courierName}</span>}
                          {event.courierName && event.trackingNumber && " — "}
                          {event.trackingNumber}
                        </p>
                      )}
                      {event.note && (
                        <p className="mt-1.5 text-sm text-slate-600">{event.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Right: actions + prescription */}
        <div className="space-y-6">
          {canUpdate ? (
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Update order</h2>
              <p className="mb-4 text-sm text-slate-500">Move this order through the fulfilment pipeline.</p>
              <RxOrderActions orderId={order.id} currentStatus={order.status} />
            </section>
          ) : (
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Order status</h2>
              <p className="mt-2 text-sm text-slate-500">
                {order.status === "DELIVERED"
                  ? "This order has been delivered — no further action needed."
                  : order.status === "CANCELLED"
                  ? "This order was cancelled."
                  : "Waiting for payment before you can action this order."}
              </p>
            </section>
          )}

          {/* Prescription document */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Prescription</h2>
            {order.rxDocumentKey ? (
              <>
                <p className="mt-1 text-sm text-slate-500">{order.rxDocumentName ?? "Attached file"}</p>
                <a
                  href={`/api/pharmacy/rx-orders/${order.id}/document`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                >
                  View / download
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No prescription document attached by patient.</p>
            )}
          </section>

          {/* Quick contact */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Contact patient</h2>
            <p className="mt-1 text-sm text-slate-500">Call or WhatsApp if you need clarification on the order.</p>
            <a
              href={`tel:${order.patientPhone}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.97-1.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {order.patientPhone}
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
