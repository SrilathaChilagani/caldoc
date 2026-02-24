import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import { validateAddress, formatAddress } from "@/lib/validateAddress";
import LabOrderActions from "./LabOrderActions";

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

const STATUS_ICONS: Record<string, string> = {
  PENDING: "🕐",
  AWAITING_PAYMENT: "💳",
  CONFIRMED: "✅",
  SAMPLE_COLLECTED: "🧪",
  PROCESSING: "🔬",
  REPORTS_READY: "📋",
  COMPLETED: "🏁",
  CANCELLED: "❌",
};

const MODE_LABELS: Record<string, string> = {
  HOME: "Home visit",
  LAB: "Lab visit",
  COURIER: "Courier",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminLabOrderDetailPage({ params }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/labs");

  const { id } = await params;

  const order = await prisma.labOrder.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      appointment: {
        select: {
          id: true,
          patientName: true,
          patient: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      patient: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!order) notFound();

  const patientName =
    order.patientName ||
    order.appointment?.patientName ||
    order.appointment?.patient?.name ||
    order.patient?.name ||
    "—";
  const patientPhone =
    order.patientPhone ||
    order.appointment?.patient?.phone ||
    order.patient?.phone ||
    "—";
  const patientEmail =
    order.patientEmail ||
    order.appointment?.patient?.email ||
    order.patient?.email;

  const address = order.address as Record<string, unknown> | null;
  const addressIssues = order.deliveryMode === "HOME" || order.deliveryMode === "COURIER"
    ? validateAddress(address as Parameters<typeof validateAddress>[0])
    : [];
  const formattedAddress = formatAddress(address);

  const tests = Array.isArray(order.tests)
    ? (order.tests as Array<{ name?: string; qty?: number } | string>)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/labs"
            className="text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
          >
            ← Back to Lab orders
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-slate-900">
            Lab order details
          </h1>
          <p className="font-mono text-xs text-slate-400">{order.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.deliveryMode && (
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              {MODE_LABELS[order.deliveryMode] ?? order.deliveryMode}
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Patient info */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Patient</h2>
              {order.appointment?.id && (
                <Link
                  href={`/provider/appointments/${order.appointment.id}?from=admin`}
                  className="text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                >
                  View appointment →
                </Link>
              )}
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-900">{patientName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{patientPhone}</dd>
              </div>
              {patientEmail && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{patientEmail}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ordered</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{formatIST(order.createdAt)}</dd>
              </div>
            </dl>

            {/* Collection agent */}
            {(order.collectionAgentName || order.collectionAgentPhone) && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold text-indigo-700">Collection agent assigned</p>
                <p className="mt-1 text-sm text-indigo-900">
                  {order.collectionAgentName && <span className="font-medium">{order.collectionAgentName}</span>}
                  {order.collectionAgentName && order.collectionAgentPhone && " · "}
                  {order.collectionAgentPhone}
                </p>
              </div>
            )}
          </section>

          {/* Address */}
          {(address || addressIssues.length > 0) && (
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                {order.deliveryMode === "HOME" ? "Home visit address" : "Delivery address"}
              </h2>
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
            </section>
          )}

          {/* Tests */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Tests ordered</h2>
              {order.amountPaise && (
                <span className="text-sm font-semibold text-slate-900">{formatINR(order.amountPaise)}</span>
              )}
            </div>
            {tests.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No tests recorded.</p>
            ) : (
              <ul className="mt-4 space-y-1.5">
                {tests.map((t, idx) => {
                  const name = typeof t === "string" ? t : (t.name ?? "Test");
                  const qty = typeof t === "object" && t.qty && t.qty > 1 ? t.qty : null;
                  return (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f6ea5]/10 text-[10px] font-bold text-[#2f6ea5]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-900">{name}</span>
                      {qty && <span className="text-xs text-slate-500">×{qty}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            {order.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold">Patient note: </span>{order.notes}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Order timeline</h2>
            <p className="text-sm text-slate-500">All status transitions for this lab order.</p>

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
                      {(event.collectionAgentName || event.collectionAgentPhone) && (
                        <p className="mt-1.5 text-xs text-indigo-700">
                          🧪 Agent:{" "}
                          {event.collectionAgentName && <span className="font-medium">{event.collectionAgentName}</span>}
                          {event.collectionAgentName && event.collectionAgentPhone && " · "}
                          {event.collectionAgentPhone}
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

        {/* Right column: update */}
        <div>
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Update order</h2>
            <p className="mb-4 text-sm text-slate-500">Change status, assign agent, or leave an internal note.</p>
            <LabOrderActions orderId={order.id} currentStatus={order.status} />
          </section>
        </div>
      </div>
    </div>
  );
}
