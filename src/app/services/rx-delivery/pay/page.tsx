import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RxOrderCheckoutClient from "../ui/RxOrderCheckoutClient";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { order?: string };

function summarizeItems(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return items.map((item) => `${item?.name || "medicine"} × ${item?.qty || 1}`).join(", ");
}

export default async function RxDeliveryPayPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { order } = (await searchParams) || {};
  if (!order) redirect("/services/rx-delivery");

  const rxOrder = await prisma.rxOrder.findUnique({ where: { id: order } });
  if (!rxOrder) redirect("/services/rx-delivery");
  if (rxOrder.status === "PAID") {
    redirect(`/services/rx-delivery/success?order=${rxOrder.id}`);
  }

  const itemsLabel = summarizeItems(rxOrder.items);

  return (
    <main className="bg-gradient-to-b from-white via-[#f7fbff] to-white py-16">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">Checkout</p>
          <h1 className="text-3xl font-semibold text-slate-900">Pay for your Rx delivery</h1>
          <p className="text-sm text-slate-500">
            Order ID {rxOrder.id}. After completing payment you&apos;ll receive a WhatsApp confirmation.
          </p>
        </div>
        <section className="rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-slate-100">
          <dl className="space-y-3 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
              <dd className="text-base text-slate-900">{rxOrder.patientName}</dd>
              <dd className="text-xs text-slate-500">{rxOrder.patientPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</dt>
              <dd>{itemsLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</dt>
              <dd className="text-xl font-semibold text-slate-900">{formatINR(rxOrder.amountPaise)}</dd>
            </div>
          </dl>
          <RxOrderCheckoutClient orderId={rxOrder.id} />
        </section>
      </div>
    </main>
  );
}
