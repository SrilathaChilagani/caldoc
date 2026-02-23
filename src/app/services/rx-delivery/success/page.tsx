import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { order?: string };

function summarizeItems(items: unknown) {
  if (!Array.isArray(items)) return [] as string[];
  return items.map((item) => `${item?.name || "medicine"} × ${item?.qty || 1}`);
}

export default async function RxDeliverySuccessPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { order } = (await searchParams) || {};
  if (!order) redirect("/services/rx-delivery");
  const rxOrder = await prisma.rxOrder.findUnique({ where: { id: order } });
  if (!rxOrder) redirect("/services/rx-delivery");

  const items = summarizeItems(rxOrder.items);

  return (
    <main className="bg-[#f7f2ea] py-16">
      <div className="mx-auto max-w-2xl space-y-8 px-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Payment successful</p>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Thank you! We&apos;re processing your order.</h1>
          <p className="text-sm text-slate-500">
            Order <span className="font-mono text-slate-700">{rxOrder.id}</span>. Our pharmacy team will confirm dispatch over WhatsApp.
          </p>
        </div>
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-left shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
          <dl className="space-y-4 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
              <dd className="text-base text-slate-900">{rxOrder.patientName}</dd>
              <dd className="text-xs text-slate-500">{rxOrder.patientPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</dt>
              <dd>
                <ul className="list-disc space-y-1 pl-5">
                  {items.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount paid</dt>
              <dd className="text-xl font-semibold text-slate-900">{formatINR(rxOrder.amountPaise)}</dd>
            </div>
          </dl>
          <Link
            href="/services/rx-delivery"
            className="mt-6 inline-flex items-center rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
          >
            Back to Rx delivery
          </Link>
        </section>
      </div>
    </main>
  );
}
