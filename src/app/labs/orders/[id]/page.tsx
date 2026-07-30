import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireLabsSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import LabCRMActions from "./LabCRMActions";

export const dynamic = "force-dynamic";

function formatIST(date: Date) {
  return date
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/ /g, " ");
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

type PageProps = { params: Promise<{ id: string }> };

export default async function LabOrderDetailPage({ params }: PageProps) {
  const sess = await requireLabsSession();
  if (!sess) redirect("/labs/login?next=/labs");

  const { id } = await params;

  const order = await prisma.labOrder.findUnique({
    where: { id },
    include: {
      appointment: {
        select: {
          id: true,
          provider: { select: { name: true, speciality: true, phone: true } },
        },
      },
      patient: { select: { name: true, phone: true, email: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  // Partner-scoped: lab users can only see their own partner's orders
  if (sess.labPartnerId && order.labPartnerId !== sess.labPartnerId) {
    notFound();
  }

  const patientName = order.patientName || order.patient?.name || "—";
  const patientPhone = order.patientPhone || order.patient?.phone || null;
  const patientEmail = order.patientEmail || order.patient?.email || null;
  const addr = order.address as Record<string, unknown> | null;
  const addrStr = formatAddress(addr);
  const tests = Array.isArray(order.tests)
    ? (order.tests as Array<{ name?: string; qty?: number } | string>)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Back + header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/labs"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Lab portal</p>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">Lab Order</h1>
            <p className="font-mono text-sm text-slate-500">#{order.id.slice(-12)}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Patient info */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Patient</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Name</p>
                <p className="text-sm font-medium text-slate-900">{patientName}</p>
              </div>
              {patientPhone && (
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Phone</p>
                  <a href={`tel:${patientPhone}`} className="font-mono text-sm text-[#2f6ea5] hover:underline">
                    {patientPhone}
                  </a>
                </div>
              )}
              {patientEmail && (
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Email</p>
                  <p className="font-mono text-sm text-slate-700">{patientEmail}</p>
                </div>
              )}
            </div>
          </section>

          {/* Home visit address */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">
              Home collection address
            </h2>
            {addrStr ? (
              <>
                <p className="text-sm text-slate-800">{addrStr}</p>
                {addr?.postalCode && (
                  <p className="mt-1 font-mono text-xs text-slate-500">PIN {String(addr.postalCode)}</p>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(addrStr)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2f6ea5] hover:underline"
                >
                  Open in Maps →
                </a>
              </>
            ) : (
              <p className="text-sm text-slate-400">No address recorded.</p>
            )}
          </section>

          {/* Collection agent */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">
              Collection agent
            </h2>
            {order.collectionAgentName || order.collectionAgentPhone ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {order.collectionAgentName && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Name</p>
                    <p className="text-sm font-medium text-indigo-700">{order.collectionAgentName}</p>
                  </div>
                )}
                {order.collectionAgentPhone && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Phone</p>
                    <a
                      href={`tel:${order.collectionAgentPhone}`}
                      className="font-mono text-sm text-indigo-600 hover:underline"
                    >
                      {order.collectionAgentPhone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Not assigned yet — assign below when confirming the order.</p>
            )}
          </section>

          {/* Tests ordered */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Tests ordered</h2>
              {order.amountPaise && (
                <span className="text-sm font-semibold text-slate-900">{formatINR(order.amountPaise)}</span>
              )}
            </div>
            {tests.length > 0 ? (
              <ul className="divide-y divide-slate-50">
                {tests.map((t, idx) => {
                  const name = typeof t === "string" ? t : (t.name ?? "Test");
                  const qty = typeof t === "object" && t.qty && t.qty > 1 ? t.qty : 1;
                  return (
                    <li key={idx} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-slate-800">{name}</span>
                      {qty > 1 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          ×{qty}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No tests listed.</p>
            )}
            {order.notes && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 italic">
                {order.notes}
              </p>
            )}
          </section>

          {/* Prescribing doctor */}
          {order.appointment?.provider && (
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">
                Prescribing doctor
              </h2>
              <p className="text-sm font-medium text-slate-900">{order.appointment.provider.name}</p>
              {order.appointment.provider.speciality && (
                <p className="text-xs text-slate-500">{order.appointment.provider.speciality}</p>
              )}
              {order.appointment.provider.phone && (
                <a
                  href={`tel:${order.appointment.provider.phone}`}
                  className="mt-1 block font-mono text-xs text-[#2f6ea5] hover:underline"
                >
                  {order.appointment.provider.phone}
                </a>
              )}
            </section>
          )}

          {/* Results */}
          {order.resultsPdfKey && (
            <section className="rounded-3xl border border-teal-100 bg-teal-50/60 p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-700">Results</h2>
              <a
                href={`/api/labs/orders/${order.id}/results/download`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M4 16v4h16v-4M12 4v12M8 12l4 4 4-4" />
                </svg>
                Download results
              </a>
            </section>
          )}

          {/* Timeline */}
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Timeline</h2>
            {order.events.length === 0 ? (
              <p className="text-sm text-slate-400">No events yet.</p>
            ) : (
              <ol className="relative border-l border-slate-200 pl-5 space-y-4">
                {order.events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-[#2f6ea5] bg-white" />
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[ev.toStatus] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {STATUS_LABELS[ev.toStatus] ?? ev.toStatus}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatIST(ev.createdAt)}</span>
                      {ev.actorEmail && (
                        <span className="text-[11px] text-slate-400">by {ev.actorEmail}</span>
                      )}
                    </div>
                    {ev.note && (
                      <p className="mt-1 text-xs text-slate-500 italic">{ev.note}</p>
                    )}
                    {(ev.collectionAgentName || ev.collectionAgentPhone) && (
                      <p className="mt-1 text-xs text-indigo-600">
                        Agent: {[ev.collectionAgentName, ev.collectionAgentPhone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-[11px] text-slate-400">
              Order placed {formatIST(order.createdAt)}
            </p>
          </section>
        </div>

        {/* RIGHT: Actions */}
        <div className="space-y-4">
          <section className="sticky top-6 rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">
              Manage order
            </h2>
            {order.status === "CANCELLED" ? (
              <p className="text-sm text-slate-400">This order has been cancelled.</p>
            ) : order.status === "AWAITING_PAYMENT" ? (
              <p className="text-sm text-slate-400">Waiting for patient payment before you can act.</p>
            ) : (
              <LabCRMActions
                orderId={order.id}
                currentStatus={order.status}
                currentAgentName={order.collectionAgentName}
                currentAgentPhone={order.collectionAgentPhone}
              />
            )}
          </section>

          {/* Quick contact */}
          {patientPhone && (
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">
                Contact patient
              </h2>
              <a
                href={`tel:${patientPhone}`}
                className="flex items-center gap-2 text-sm font-medium text-[#2f6ea5] hover:underline"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {patientPhone}
              </a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
