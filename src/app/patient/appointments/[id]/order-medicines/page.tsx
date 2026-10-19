import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import OrderMedicinesForm from "./OrderMedicinesForm";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderMedicinesPage({ params }: PageProps) {
  const { id } = await params;
  const session = await readPatientSession();
  if (!session) redirect(`/patient/login?next=/patient/appointments/${id}/order-medicines`);

  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true, name: true, phone: true },
  });
  if (!patient) redirect(`/patient/login?next=/patient/appointments/${id}/order-medicines`);

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      prescription: true,
      rxOrders: {
        where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!appointment || appointment.patientId !== patient.id) notFound();

  // If an active order already exists, redirect straight to review
  if (appointment.rxOrders.length > 0) {
    redirect(`/patient/rx-orders/${appointment.rxOrders[0].id}/review`);
  }

  if (!appointment.prescription) {
    redirect(`/patient/appointments/${id}?err=no-prescription`);
  }

  type Med = { name: string; sig?: string | null; qty?: string | null };
  const medsRaw = appointment.prescription.meds;
  const meds: Med[] = Array.isArray(medsRaw)
    ? (medsRaw as Array<Record<string, unknown>>)
        .map((m) => ({
          name: String(m.name || "").trim(),
          sig: m.sig ? String(m.sig).trim() : null,
          qty: m.qty ? String(m.qty).trim() : null,
        }))
        .filter((m) => m.name)
    : [];

  if (!meds.length) {
    redirect(`/patient/appointments/${id}?err=empty-prescription`);
  }

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
          <h1 className="mt-2 font-serif text-3xl text-slate-900">Order your medicines</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your prescription will be sent to a licensed pharmacy partner. They will review it,
            confirm availability, and provide a quote before delivery.
            CalDoc coordinates your order; the pharmacy partner dispenses your medicines.
          </p>
        </div>

        <OrderMedicinesForm
          appointmentId={id}
          meds={meds}
          patientName={patient.name ?? "Patient"}
          patientPhone={patient.phone}
        />
      </div>
    </main>
  );
}
