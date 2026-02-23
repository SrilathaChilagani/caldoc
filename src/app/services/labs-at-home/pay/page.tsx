import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import LabHomeCheckoutClient from "../ui/LabHomeCheckoutClient";
import { LABS_HOME_TEST_PAISE } from "@/lib/labPricing";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type Search = { order?: string };

type TestItem = { name?: string; qty?: number };

function normalizeTests(tests: unknown): TestItem[] {
  if (!Array.isArray(tests)) return [];
  return tests
    .map((test) => ({
      name: String((test as TestItem)?.name || test || "").trim(),
      qty: Math.max(1, Number((test as TestItem)?.qty) || 1),
    }))
    .filter((test) => test.name);
}

export default async function LabsAtHomePayPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { order } = (await searchParams) || {};
  if (!order) redirect("/services/labs-at-home");

  const labOrder = await prisma.labOrder.findUnique({ where: { id: order } });
  if (!labOrder) redirect("/services/labs-at-home");
  if (labOrder.status !== "AWAITING_PAYMENT") {
    redirect(`/services/labs-at-home/success?order=${labOrder.id}`);
  }

  const tests = normalizeTests(labOrder.tests);
  const totalQty = tests.reduce((sum, test) => sum + Math.max(1, test.qty || 0), 0);

  return (
    <main className="bg-[#f7f2ea] py-16">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <BackButton />
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2f6ea5]">Checkout</p>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Confirm your lab order</h1>
          <p className="text-sm text-slate-500">
            Order ID {labOrder.id}. Complete the payment to schedule doorstep sample collection.
          </p>
        </div>
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
          <dl className="space-y-3 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
              <dd className="text-base text-slate-900">{labOrder.patientName}</dd>
              <dd className="text-xs text-slate-500">{labOrder.patientPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tests</dt>
              {tests.length ? (
                <dd className="mt-2">
                  <div className="space-y-2">
                    {tests.map((test) => (
                      <div key={`${test.name}-${test.qty}`} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{test.name}</p>
                          <p className="text-xs text-slate-500">Qty {test.qty}</p>
                        </div>
                        <span className="text-slate-700">
                          {formatINR(Math.max(1, test.qty || 0) * LABS_HOME_TEST_PAISE)}
                        </span>
                      </div>
                    ))}
                  </div>
                </dd>
              ) : (
                <dd className="text-sm text-slate-500">No tests found.</dd>
              )}
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</dt>
              <dd className="text-xl font-semibold text-slate-900">{formatINR(labOrder.amountPaise)}</dd>
              <dd className="text-xs text-slate-500">
                {totalQty} test{totalQty === 1 ? "" : "s"} × {formatINR(LABS_HOME_TEST_PAISE)}
              </dd>
            </div>
          </dl>
          <LabHomeCheckoutClient orderId={labOrder.id} />
        </section>
      </div>
    </main>
  );
}
