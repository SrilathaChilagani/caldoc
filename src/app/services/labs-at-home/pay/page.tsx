import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import LabHomeCheckoutClient from "../ui/LabHomeCheckoutClient";

export const dynamic = "force-dynamic";

type Search = { order?: string };

function summarizeTests(tests: unknown): string {
  if (Array.isArray(tests)) return tests.map((t) => String(t)).join(", ");
  if (typeof tests === "string") return tests;
  return "";
}

export default async function LabsAtHomePayPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { order } = (await searchParams) || {};
  if (!order) redirect("/services/labs-at-home");

  const labOrder = await prisma.labOrder.findUnique({ where: { id: order } });
  if (!labOrder) redirect("/services/labs-at-home");
  if (labOrder.status !== "AWAITING_PAYMENT") {
    redirect(`/services/labs-at-home/success?order=${labOrder.id}`);
  }

  const testsLabel = summarizeTests(labOrder.tests);

  return (
    <main className="bg-gradient-to-b from-white via-[#f0fff5] to-white py-16">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">Checkout</p>
          <h1 className="text-3xl font-semibold text-slate-900">Confirm your lab order</h1>
          <p className="text-sm text-slate-500">
            Order ID {labOrder.id}. Complete the payment to schedule doorstep sample collection.
          </p>
        </div>
        <section className="rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-slate-100">
          <dl className="space-y-3 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
              <dd className="text-base text-slate-900">{labOrder.patientName}</dd>
              <dd className="text-xs text-slate-500">{labOrder.patientPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tests</dt>
              <dd>{testsLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</dt>
              <dd className="text-xl font-semibold text-slate-900">{formatINR(labOrder.amountPaise)}</dd>
            </div>
          </dl>
          <LabHomeCheckoutClient orderId={labOrder.id} />
        </section>
      </div>
    </main>
  );
}
