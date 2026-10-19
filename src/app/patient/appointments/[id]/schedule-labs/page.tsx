import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import { findTestByName } from "@/lib/labCatalog";
import ScheduleLabsForm from "./ScheduleLabsForm";
import PartnerDisclosureCard from "@/components/PartnerDisclosureCard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ order?: string }>;
};

type TestEntry = {
  name: string;
  fasting: boolean;
  fastingHours?: number;
  sampleType: string;
  prepInstructions: string;
  homeCollectionOk: boolean;
};

function normalizeTests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => String((t as { name?: string })?.name || t || "").trim())
    .filter(Boolean);
}

export default async function ScheduleLabsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { order: orderId } = await searchParams;

  const session = await readPatientSession();
  if (!session) redirect(`/patient/login?next=/patient/appointments/${id}/schedule-labs`);

  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true, phone: true, name: true },
  });
  if (!patient) redirect(`/patient/login?next=/patient/appointments/${id}/schedule-labs`);

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      labOrders: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        orderBy: { createdAt: "asc" },
        include: {
          labPartner: {
            select: { name: true, city: true, state: true, nablCertified: true, nablCertNumber: true },
          },
        },
      },
      provider: { select: { name: true } },
    },
  });

  if (!appointment || appointment.patientId !== patient.id) notFound();

  const labOrder = orderId
    ? appointment.labOrders.find((o) => o.id === orderId)
    : appointment.labOrders[0];

  if (!labOrder) {
    redirect(`/patient/appointments/${id}?err=no-lab-order`);
  }

  const testNames = normalizeTests(labOrder.tests);
  const tests: TestEntry[] = testNames.map((name) => {
    const entry = findTestByName(name);
    return {
      name,
      fasting: entry?.fasting ?? false,
      fastingHours: entry?.fastingHours,
      sampleType: entry?.sampleType ?? "Blood",
      prepInstructions: entry?.prepInstructions ?? "No special preparation required.",
      homeCollectionOk: entry?.homeCollectionOk ?? true,
    };
  });

  // Try to get patient's last known address from a previous lab order
  const prevOrder = await prisma.labOrder.findFirst({
    where: { patientId: patient.id, address: { not: undefined } },
    orderBy: { createdAt: "desc" },
    select: { address: true },
  });
  const lastAddress = prevOrder?.address as Record<string, string> | null;
  const patientAddress =
    lastAddress?.line1
      ? {
          line1: String(lastAddress.line1),
          city: String(lastAddress.city ?? ""),
          state: String(lastAddress.state ?? ""),
          postalCode: String(lastAddress.postalCode ?? ""),
        }
      : null;

  return (
    <main className="min-h-screen bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <div>
          <Link
            href={`/patient/appointments/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to appointment
          </Link>
          <h1 className="mt-2 font-serif text-3xl text-slate-900">Schedule lab collection</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ordered by {appointment.provider?.name ?? "your doctor"} · {testNames.length} test{testNames.length !== 1 ? "s" : ""}
          </p>
        </div>

        <PartnerDisclosureCard type="lab" partner={labOrder.labPartner ?? null} />

        <ScheduleLabsForm
          appointmentId={id}
          labOrderId={labOrder.id}
          tests={tests}
          patientAddress={patientAddress}
        />
      </div>
    </main>
  );
}
