import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import { validateAddress, formatAddress } from "@/lib/validateAddress";
import RxOrderActions from "./RxOrderActions";

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

const STATUS_ICONS: Record<string, string> = {
  AWAITING_PAYMENT: "💳",
  PAID: "✅",
  PROCESSING: "📦",
  DISPATCHED: "🚚",
  DELIVERED: "🏠",
  CANCELLED: "❌",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminRxOrderDetailPage({ params }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/rx-orders");

  const { id } = await params;

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      patient: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!order) notFound();

  const address = order.address as Record<string, unknown> | null;
  const addressIssues = validateAddress(address as Parameters<typeof validateAddress>[0]);
  const formattedAddress = formatAddress(address);

  const items = Array.isArray(order.items)
    ? (order.items as Array<{ name?: string; qty?: number; price?: number }>)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/rx-orders"
            className="text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
          >
            ← Back to Rx orders
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-slate-900">
            Order details
          </h1>
          <p className="font-mono text-xs text-slate-400">{order.id}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: patient, address, items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Patient info */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Patient</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-900">{order.patientName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{order.patientPhone}</dd>
              </div>
              {order.patientEmail && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{order.patientEmail}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ordered</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{formatIST(order.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {/* Delivery address */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Delivery address</h2>
            {addressIssues.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700">Address validation warnings</p>
                <ul className="mt-1.5 space-y-1">
                  {addressIssues.map((issue) => (
                    <li key={issue.field} className="text-xs text-amber-600">
                      • <span className="font-medium capitalize">{issue.field}</span>: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {formattedAddress ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {!!address?.line1 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Street</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">
                      {String(address.line1)}
                      {address.line2 ? `, ${String(address.line2)}` : ""}
                    </dd>
                  </div>
                )}
                {!!address?.city && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">City</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">{String(address.city)}</dd>
                  </div>
                )}
                {!!address?.state && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">State</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">{String(address.state)}</dd>
                  </div>
                )}
                {!!address?.postalCode && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">PIN</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">{String(address.postalCode)}</dd>
                  </div>
                )}
                {!!address?.contactPhone && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact phone</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">{String(address.contactPhone)}</dd>
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
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Items</h2>
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

          {/* Supply chain timeline */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Order timeline</h2>
            <p className="text-sm text-slate-500">All status transitions and notes for this order.</p>

            {order.events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No events recorded yet.</p>
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

        {/* Right column: update status */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Update order</h2>
            <p className="mb-4 text-sm text-slate-500">Change status, add tracking info, or leave an internal note.</p>
            <RxOrderActions orderId={order.id} currentStatus={order.status} />
          </section>

          {/* Rx document */}
          {order.rxDocumentKey && (
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Prescription document</h2>
              <p className="mt-1 text-sm text-slate-500">{order.rxDocumentName ?? "Attached file"}</p>
              <Link
                href={`/api/admin/rx-orders/${order.id}/document`}
                target="_blank"
                className="mt-3 inline-flex items-center text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
              >
                View / download →
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
