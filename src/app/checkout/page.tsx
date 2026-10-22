import Link from "next/link";
import { redirect } from "next/navigation";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { prisma } from "@/lib/db";
import CheckoutClient from "./ui/CheckoutClient";

type PageProps = {
  searchParams?: Promise<{ appointmentId?: string; amount?: string; embed?: string; returnTo?: string }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  const appointmentId = sp.appointmentId;
  const amount = sp.amount ? Number(sp.amount) : undefined;
  const embed = sp.embed;
  const returnTo = sp.returnTo;

  if (!appointmentId) {
    return (
      <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10 px-6 lg:px-16 xl:px-24">
        <h1 className="text-xl font-semibold text-rose-600">Missing appointment</h1>
        <p className="mt-2 text-sm text-slate-500">We need an appointmentId to start checkout.</p>
        <Link href="/" className="mt-4 inline-flex items-center rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]">
          Go home
        </Link>
      </main>
    );
  }

  // The create-order API requires a patient session — redirect to login if absent
  const phone = await readPatientPhone();
  if (!phone) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patient: { select: { phone: true } } },
    });
    const patientPhone = appt?.patient?.phone ?? "";

    const checkoutParams = new URLSearchParams({ appointmentId });
    if (amount) checkoutParams.set("amount", String(amount));
    if (embed) checkoutParams.set("embed", embed);
    if (returnTo) checkoutParams.set("returnTo", returnTo);

    const loginParams = new URLSearchParams({ next: `/checkout?${checkoutParams}` });
    if (patientPhone) loginParams.set("phone", patientPhone);
    redirect(`/patient/login?${loginParams}`);
  }

  return (
    <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="w-full px-6 lg:px-16 xl:px-24">
        <h1 className="text-2xl font-semibold text-slate-900">Processing payment</h1>
        <p className="mt-1 text-sm text-slate-500">
          We&apos;re preparing Razorpay checkout for your appointment. Please wait, you&apos;ll see the secure payment popup shortly.
        </p>
        <CheckoutClient appointmentId={appointmentId} amount={amount} />
      </div>
    </main>
  );
}
