import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RxOrderCheckoutClient from "../ui/RxOrderCheckoutClient";
import { formatINR } from "@/lib/format";
import { RX_DELIVERY_UNIT_PRICE_PAISE } from "@/lib/rxDeliveryPricing";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type Search = { order?: string };

type OrderItem = { name?: string; qty?: number };

function normalizeItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      name: String(item?.name || "").trim(),
      qty: Number(item?.qty) || 1,
    }))
    .filter((item) => item.name);
}

export default async function RxDeliveryPayPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { order } = (await searchParams) || {};
  if (!order) redirect("/services/rx-delivery");

  const rxOrder = await prisma.rxOrder.findUnique({ where: { id: order } });
  if (!rxOrder) redirect("/services/rx-delivery");
  if (rxOrder.status === "PAID") {
    redirect(`/services/rx-delivery/success?order=${rxOrder.id}`);
  }

  const items = normalizeItems(rxOrder.items);
  const totalQty = items.reduce((sum, item) => sum + Math.max(1, item.qty || 0), 0);

  return (
    <main className="bg-[#f7f2ea] py-16">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <BackButton />
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2f6ea5]">Checkout</p>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Pay for your Rx delivery</h1>
          <p className="text-sm text-slate-500">
            Order ID {rxOrder.id}. After completing payment you&apos;ll receive a WhatsApp confirmation.
          </p>
        </div>
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
          <dl className="space-y-3 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
              <dd className="text-base text-slate-900">{rxOrder.patientName}</dd>
              <dd className="text-xs text-slate-500">{rxOrder.patientPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</dt>
              {items.length ? (
                <dd className="mt-2">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={`${item.name}-${item.qty}`} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">Qty {item.qty}</p>
                        </div>
                        <span className="text-slate-700">
                          {formatINR(Math.max(1, item.qty || 0) * RX_DELIVERY_UNIT_PRICE_PAISE)}
                        </span>
                      </div>
                    ))}
                  </div>
                </dd>
              ) : (
                <dd className="text-sm text-slate-500">No items found.</dd>
              )}
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</dt>
              <dd className="text-xl font-semibold text-slate-900">{formatINR(rxOrder.amountPaise)}</dd>
              <dd className="text-xs text-slate-500">
                {totalQty} item{totalQty === 1 ? "" : "s"} × {formatINR(RX_DELIVERY_UNIT_PRICE_PAISE)}
              </dd>
            </div>
            {rxOrder.rxDocumentKey && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prescription</dt>
                <dd className="text-sm text-emerald-600">Uploaded</dd>
              </div>
            )}
          </dl>
          <RxOrderCheckoutClient orderId={rxOrder.id} />
        </section>
      </div>
    </main>
  );
}
