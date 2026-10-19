import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import { formatINR } from "@/lib/format";
import { findTestByName } from "@/lib/labCatalog";
import PartnerDisclosureCard from "@/components/PartnerDisclosureCard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scheduled?: string }>;
};

function formatIST(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTests(raw: unknown): Array<{ name: string; qty: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => ({
      name: String((t as { name?: string })?.name || t || "").trim(),
      qty: Math.max(1, Number((t as { qty?: number })?.qty) || 1),
    }))
    .filter((t) => t.name);
}

const STATUS_META: Record<string, { label: string; color: string; description: string }> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700",
    description: "Lab order placed. Awaiting confirmation from the lab team.",
  },
  AWAITING_PAYMENT: {
    label: "Awaiting payment",
    color: "bg-amber-100 text-amber-700",
    description: "Please complete payment to confirm your lab order.",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    description: "Your order has been confirmed. Schedule your collection below.",
  },
  SAMPLE_COLLECTED: {
    label: "Sample collected",
    color: "bg-indigo-100 text-indigo-700",
    description: "Samples have been collected and sent to the lab for processing.",
  },
  PROCESSING: {
    label: "Processing",
    color: "bg-violet-100 text-violet-700",
    description: "Your samples are being analysed in the lab.",
  },
  REPORTS_READY: {
    label: "Results ready",
    color: "bg-teal-100 text-teal-700",
    description: "Your results are available. Download your report below.",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
    description: "This order has been completed.",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-slate-100 text-slate-500",
    description: "This order was cancelled.",
  },
};

export default async function PatientLabOrderDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { scheduled } = await searchParams;

  const session = await readPatientSession();
  if (!session) redirect(`/patient/login?next=/patient/lab-orders/${id}`);

  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true, phone: true },
  });
  if (!patient) redirect(`/patient/login?next=/patient/lab-orders/${id}`);

  const order = await prisma.labOrder.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      payment: { select: { receiptUrl: true } },
      labPartner: {
        select: { name: true, city: true, state: true, nablCertified: true, nablCertNumber: true },
      },
      appointment: {
        include: {
          provider: { select: { name: true, slug: true, id: true } },
        },
      },
    },
  });

  if (!order) notFound();

  // Verify patient owns this order
  const patientLast10 = patient.phone.replace(/\D/g, "").slice(-10);
  const orderLast10 = (order.patientPhone ?? "").replace(/\D/g, "").slice(-10);
  const isOwnOrder =
    order.patientId === patient.id ||
    (patientLast10 && patientLast10 === orderLast10);

  if (!isOwnOrder) notFound();

  const tests = normalizeTests(order.tests);
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    color: "bg-slate-100 text-slate-600",
    description: "",
  };
  const address = order.address as Record<string, string> | null;

  const canSchedule =
    ["PENDING", "CONFIRMED"].includes(order.status) && !order.scheduledFor;
  const hasSchedule = !!order.scheduledFor;
  const isResultsReady = order.status === "REPORTS_READY" || order.status === "COMPLETED";

  const provider = order.appointment?.provider;
  const followUpPath = provider
    ? `/book/${encodeURIComponent(provider.slug || provider.id)}`
    : null;

  return (
    <main className="min-h-screen bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4">

        {/* Header */}
        <div>
          <Link
            href={order.appointmentId ? `/patient/appointments/${order.appointmentId}` : "/patient/labs"}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {order.appointmentId ? "Back to appointment" : "Back to lab orders"}
          </Link>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-slate-900">Lab order</h1>
              <p className="font-mono text-xs text-slate-400">{order.id}</p>
            </div>
            <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase ${meta.color}`}>
              {meta.label}
            </span>
          </div>
        </div>

        {/* Scheduled success banner */}
        {scheduled && (
          <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Collection scheduled. The lab team will confirm via WhatsApp.
          </div>
        )}

        {/* Status description */}
        <div className="rounded-2xl border border-[#2f6ea5]/15 bg-[#f0f5fa] px-4 py-3 text-sm text-[#1a4a72]">
          {meta.description}
        </div>

        {/* Partner transparency */}
        <PartnerDisclosureCard type="lab" partner={order.labPartner ?? null} />

        {/* Results CTA */}
        {isResultsReady && order.resultsPdfKey && (
          <section className="rounded-3xl border border-teal-100 bg-teal-50 p-6">
            <h2 className="font-serif text-lg text-teal-900">Your results are ready</h2>
            <p className="mt-1 text-sm text-teal-700">Download your report and share with your doctor.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href={`/api/patient/lab-orders/results/${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M4 16v4h16v-4M12 4v12M8 12l4 4 4-4" />
                </svg>
                Download results
              </a>
              {followUpPath && (
                <Link
                  href={followUpPath}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-300 px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Book follow-up with doctor →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Awaiting payment CTA */}
        {order.status === "AWAITING_PAYMENT" && order.amountPaise && (
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg text-slate-900">Complete payment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Amount: <span className="font-semibold">{formatINR(order.amountPaise)}</span>
            </p>
            <a
              href={`/services/labs-at-home/pay?order=${order.id}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b]"
            >
              Pay {formatINR(order.amountPaise)} →
            </a>
          </section>
        )}

        {/* Schedule CTA */}
        {canSchedule && order.appointmentId && (
          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
            <h2 className="font-serif text-lg text-blue-900">Schedule your collection</h2>
            <p className="mt-1 text-sm text-blue-700">Pick a date and time for home collection or walk-in at the lab.</p>
            <Link
              href={`/patient/appointments/${order.appointmentId}/schedule-labs?order=${order.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2f6ea5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
            >
              Schedule collection →
            </Link>
          </section>
        )}

        {/* Scheduled info */}
        {hasSchedule && (
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg text-slate-900">Collection scheduled</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date & time</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{formatIST(order.scheduledFor)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</dt>
                <dd className="mt-0.5 text-slate-900">
                  {order.collectionType === "HOME" ? "Home collection" : "Walk-in at lab"}
                </dd>
              </div>
              {address?.line1 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</dt>
                  <dd className="mt-0.5 text-slate-900">
                    {address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} — {address.postalCode}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Tests with prep info */}
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-slate-900">Ordered tests</h2>
            {order.amountPaise && order.status !== "AWAITING_PAYMENT" && (
              <span className="text-sm font-semibold text-slate-900">{formatINR(order.amountPaise)}</span>
            )}
          </div>
          {tests.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No tests recorded.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {tests.map((test, i) => {
                const entry = findTestByName(test.name);
                return (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                        {entry?.whyOrdered && (
                          <p className="mt-0.5 text-xs text-slate-500">{entry.whyOrdered}</p>
                        )}
                      </div>
                      {entry?.pricePaise && (
                        <p className="shrink-0 text-xs text-slate-500">{formatINR(entry.pricePaise)}</p>
                      )}
                    </div>
                    {entry && (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${entry.fasting ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {entry.fasting ? `Fast ${entry.fastingHours ?? 8}h` : "No fasting"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          {entry.sampleType}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          {entry.turnaroundDays}d result
                        </span>
                        {!entry.homeCollectionOk && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                            Walk-in only
                          </span>
                        )}
                      </div>
                    )}
                    {entry?.prepInstructions && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{entry.prepInstructions}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {order.notes && (
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">Doctor's note: </span>{order.notes}
            </div>
          )}
        </section>

        {/* Receipt */}
        {order.payment?.receiptUrl && (
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg text-slate-900">Receipt</h2>
            <a
              href={order.payment.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
            >
              Download receipt →
            </a>
          </section>
        )}

        {/* Timeline */}
        {order.events.length > 0 && (
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg text-slate-900">Order timeline</h2>
            <ol className="relative mt-5 ml-3 border-l border-slate-200">
              {order.events.map((event) => {
                const em = STATUS_META[event.toStatus];
                return (
                  <li key={event.id} className="mb-5 ml-5">
                    <span className="absolute -left-2.5 h-5 w-5 rounded-full bg-white ring-2 ring-slate-200" />
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${em?.color ?? "bg-slate-100 text-slate-600"}`}>
                        {em?.label ?? event.toStatus}
                      </span>
                      <p className="mt-1 text-xs text-slate-400">{formatIST(event.createdAt)}</p>
                      {event.note && <p className="mt-1 text-xs text-slate-600">{event.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}
