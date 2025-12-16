import { prisma } from "@/lib/db";
import RxDeliveryForm from "./ui/RxDeliveryForm";

export const dynamic = "force-dynamic";

export default async function RxDeliveryPage() {
  const meds = await prisma.medication.findMany({
    where: { category: "OTC" },
    orderBy: { name: "asc" },
    take: 200,
    select: { name: true },
  });
  const options = meds.map((m) => m.name);

  return (
    <main className="bg-gradient-to-b from-white via-[#f7fbff] to-white py-16">
      <div className="mx-auto max-w-5xl space-y-10 px-6">
        <div className="space-y-4 text-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-500">Rx delivery</p>
          <h1 className="text-3xl font-semibold text-slate-900">Request OTC medicines for home delivery</h1>
          <p className="text-base text-slate-600">
            Skip clinic visits for routine medications. Tell us what you need, add your delivery details, and pay securely.
            Our pharmacy team will confirm dispatch over WhatsApp.
          </p>
        </div>
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
          <RxDeliveryForm options={options} />
        </div>
      </div>
    </main>
  );
}
