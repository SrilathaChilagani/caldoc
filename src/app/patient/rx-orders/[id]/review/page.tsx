import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import { formatINR } from "@/lib/format";
import QuoteReviewForm from "./QuoteReviewForm";
import PartnerDisclosureCard from "@/components/PartnerDisclosureCard";

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

const STATUS_META: Record<string, { label: string; color: string; description: string }> = {
  QUOTE_PENDING: {
    label: "Awaiting pharmacy",
    color: "bg-amber-100 text-amber-700",
    description: "Your prescription has been sent to the pharmacy partner. They will review and send you a quote shortly.",
  },
  QUOTE_READY: {
    label: "Quote ready",
    color: "bg-blue-100 text-blue-700",
    description: "The pharmacy partner has reviewed your prescription. Review the items below and confirm your order.",
  },
  AWAITING_PAYMENT: {
    label: "Awaiting payment",
    color: "bg-violet-100 text-violet-700",
    description: "Order confirmed. Proceed to payment to begin processing.",
  },
  PAID: {
    label: "Paid",
    color: "bg-emerald-100 text-emerald-700",
    description: "Payment received. The pharmacy partner is processing your order.",
  },
  PROCESSING: {
    label: "Processing",
    color: "bg-violet-100 text-violet-700",
    description: "The pharmacy partner is packing your medicines.",
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-indigo-100 text-indigo-700",
    description: "Your order is on its way via the delivery partner.",
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-700",
    description: "Your medicines have been delivered.",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    description: "This order could not be fulfilled by the pharmacy partner.",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-slate-100 text-slate-600",
    description: "This order was cancelled.",
  },
  DELIVERY_FAILED: {
    label: "Delivery failed",
    color: "bg-red-100 text-red-700",
    description: "Delivery attempt failed. Our team will contact you to reschedule.",
  },
};

const ITEM_STATUS_META: Record<string, { label: string; color: string }> = {
  AVAILABLE:          { label: "Available",           color: "bg-emerald-100 text-emerald-700" },
  SUBSTITUTED:        { label: "Substitute suggested",color: "bg-amber-100 text-amber-700" },
  UNAVAILABLE:        { label: "Unavailable",         color: "bg-red-100 text-red-700" },
  PENDING:            { label: "Pending review",      color: "bg-slate-100 text-slate-600" },
  REJECTED_BY_PATIENT:{ label: "Rejected by you",    color: "bg-slate-100 text-slate-500" },
};

export default async function RxOrderReviewPage({ params }: PageProps) {
  const { id } = await params;
  const session = await readPatientSession();
  if (!session) redirect(`/patient/login?next=/patient/rx-orders/${id}/review`);

  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true, phone: true },
  });
  if (!patient) redirect(`/patient/login?next=/patient/rx-orders/${id}/review`);

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    include: {
      rxOrderItems: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      pharmacyPartner: {
        select: { name: true, city: true, state: true, drugLicenseNumber: true },
      },
    },
  });

  if (!order) notFound();

  // Verify patient owns this order
  const patientLast10 = patient.phone.replace(/\D/g, "").slice(-10);
  const orderLast10 = order.patientPhone.replace(/\D/g, "").slice(-10);
  if (!patientLast10 || patientLast10 !== orderLast10) notFound();

  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    color: "bg-slate-100 text-slate-600",
    description: "",
  };

  const isQuoteReady = order.status === "QUOTE_READY";
  const isAwaitingPayment = order.status === "AWAITING_PAYMENT";
  const isTerminal = ["DELIVERED", "CANCELLED", "REJECTED", "DELIVERY_FAILED"].includes(order.status);
  const isFulfilling = ["PAID", "PROCESSING", "DISPATCHED"].includes(order.status);

  const substitutedItems = order.rxOrderItems.filter((i) => i.status === "SUBSTITUTED");
  const quoteExpired = order.quoteExpiresAt && order.quoteExpiresAt < new Date();

  return (
    <main className="min-h-screen bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4">

        {/* Header */}
        <div>
          <Link
            href="/patient/appointments"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to appointments
          </Link>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-slate-900">Medicine order</h1>
              <p className="font-mono text-xs text-slate-400">{order.id}</p>
            </div>
            <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase ${meta.color}`}>
              {meta.label}
            </span>
          </div>
        </div>

        {/* Status description */}
        <div className="rounded-2xl border border-[#2f6ea5]/15 bg-[#f0f5fa] px-4 py-3 text-sm text-[#1a4a72]">
          {meta.description}
          {isQuoteReady && order.quoteExpiresAt && (
            <span className={`ml-1 ${quoteExpired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
              {quoteExpired
                ? " This quote has expired."
                : ` Quote expires ${formatIST(order.quoteExpiresAt)}.`}
            </span>
          )}
        </div>

        {/* Partner transparency */}
        <PartnerDisclosureCard
          type="pharmacy"
          partner={order.pharmacyPartner ?? null}
        />

        {/* Quote expired warning */}
        {isQuoteReady && quoteExpired && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            Your quote has expired. Please contact us or place a new order.
          </div>
        )}

        {/* Medicine items */}
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-slate-900">Medicines</h2>
            {(isQuoteReady || isAwaitingPayment || isFulfilling) && order.quotedAmountPaise != null && (
              <span className="text-sm font-semibold text-slate-900">
                {formatINR(isAwaitingPayment || isFulfilling ? order.amountPaise : order.quotedAmountPaise)}
              </span>
            )}
          </div>

          {order.rxOrderItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No items on this order.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {order.rxOrderItems.map((item) => {
                const im = ITEM_STATUS_META[item.status] ?? { label: item.status, color: "bg-slate-100 text-slate-600" };
                return (
                  <li key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        {item.sig && <p className="text-xs text-slate-500">Dosage: {item.sig}</p>}
                        {item.qtyPrescribed && <p className="text-xs text-slate-500">Qty: {item.qtyPrescribed}</p>}
                        {item.status === "SUBSTITUTED" && item.dispensedName && (
                          <p className="mt-1 text-xs text-amber-700">
                            Substitute: <span className="font-semibold">{item.dispensedName}</span>
                            {item.dispensedSig && ` — ${item.dispensedSig}`}
                          </p>
                        )}
                        {item.note && <p className="mt-0.5 text-xs text-slate-500 italic">{item.note}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${im.color}`}>
                          {im.label}
                        </span>
                        {item.unitPricePaise != null && item.qtyDispensed != null && (
                          <p className="mt-1 text-xs text-slate-500">
                            {formatINR(item.unitPricePaise)} × {item.qtyDispensed} = {formatINR(item.unitPricePaise * item.qtyDispensed)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {order.quoteNote && (
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">Pharmacy note: </span>{order.quoteNote}
            </div>
          )}
        </section>

        {/* Quote review action — confirm / reject */}
        {isQuoteReady && !quoteExpired && (
          <QuoteReviewForm
            orderId={order.id}
            substitutedItems={substitutedItems.map((i) => ({
              id: i.id,
              prescribedName: i.name,
              dispensedName: i.dispensedName ?? "",
              dispensedSig: i.dispensedSig ?? null,
              unitPricePaise: i.unitPricePaise ?? 0,
              qtyDispensed: i.qtyDispensed ?? 1,
            }))}
          />
        )}

        {/* Awaiting payment CTA */}
        {isAwaitingPayment && (
          <div className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg text-slate-900">Pay to confirm</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your order total is{" "}
              <span className="font-semibold text-slate-900">{formatINR(order.amountPaise)}</span>.
              Payment is processed securely via Razorpay.
            </p>
            <a
              href={`/services/rx-delivery/pay?order=${order.id}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b]"
            >
              Pay {formatINR(order.amountPaise)} →
            </a>
          </div>
        )}

        {/* Tracking info */}
        {(isFulfilling || order.status === "DELIVERED") && order.trackingNumber && (
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
            <h2 className="font-serif text-lg text-slate-900">Tracking</h2>
            <p className="mt-2 text-sm text-slate-700">
              {order.courierName && <span className="font-semibold">{order.courierName} — </span>}
              {order.trackingNumber}
            </p>
          </section>
        )}

        {/* Order timeline */}
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

        {/* Terminal: rejected / cancelled / failed — show go-back link */}
        {isTerminal && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center">
            <p className="text-sm text-slate-500">
              Need help?{" "}
              <a href="mailto:help@caldoc.in" className="text-[#2f6ea5] font-medium hover:underline">
                Contact support
              </a>
            </p>
            <Link
              href="/patient/appointments"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to appointments
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
