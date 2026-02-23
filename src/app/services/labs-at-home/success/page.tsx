import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { order?: string };

function summarizeTests(tests: unknown) {
  if (!tests) return [] as string[];
  if (Array.isArray(tests)) {
    return tests.map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object" && "name" in t) {
        const obj = t as Record<string, unknown>;
        const name = String(obj.name || "test");
        const qty = Number(obj.qty) || 1;
        return qty > 1 ? `${name} × ${qty}` : name;
      }
      return String(t);
    });
  }
  if (typeof tests === "string") return [tests];
  return [] as string[];
}

export default async function LabsAtHomeSuccessPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { order } = (await searchParams) || {};
  if (!order) redirect("/services/labs-at-home");
  const labOrder = await prisma.labOrder.findUnique({ where: { id: order } });
  if (!labOrder) redirect("/services/labs-at-home");

  const tests = summarizeTests(labOrder.tests);

  return (
    <main className="bg-[#f7f2ea] py-16">
      <div className="mx-auto max-w-2xl space-y-8 px-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Payment successful</p>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Thanks! Our labs team is on it.</h1>
          <p className="text-sm text-slate-500">
            Order <span className="font-mono text-slate-700">{labOrder.id}</span>. We&apos;ll message you on WhatsApp to confirm pickup details.
          </p>
        </div>
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-left shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
          <dl className="space-y-4 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
              <dd className="text-base text-slate-900">{labOrder.patientName}</dd>
              <dd className="text-xs text-slate-500">{labOrder.patientPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tests</dt>
              <dd>
                <ul className="list-disc space-y-1 pl-5">
                  {tests.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount paid</dt>
              <dd className="text-xl font-semibold text-slate-900">{formatINR(labOrder.amountPaise)}</dd>
            </div>
          </dl>
          <Link
            href="/services/labs-at-home"
            className="mt-6 inline-flex items-center rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
          >
            Back to Labs at home
          </Link>
        </section>
      </div>
    </main>
  );
}
