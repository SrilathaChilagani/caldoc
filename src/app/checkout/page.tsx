import Link from "next/link";
import CheckoutClient from "./ui/CheckoutClient";

type PageProps = {
  searchParams?: Promise<{ appointmentId?: string; amount?: string }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  const appointmentId = sp.appointmentId;
  const amount = sp.amount ? Number(sp.amount) : undefined;

  if (!appointmentId) {
    return (
    <main className="mx-auto max-w-3xl bg-white px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-rose-600">Missing appointment</h1>
        <p className="mt-2 text-sm text-slate-500">We need an appointmentId to start checkout.</p>
        <Link href="/" className="mt-4 inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Go home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl bg-white px-4 py-16">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Processing payment</h1>
        <p className="mt-1 text-sm text-slate-500">
          We&apos;re preparing Razorpay checkout for your appointment. Please wait, you&apos;ll see the secure payment popup shortly.
        </p>

        <CheckoutClient appointmentId={appointmentId} amount={amount} />
      </div>
    </main>
  );
}
