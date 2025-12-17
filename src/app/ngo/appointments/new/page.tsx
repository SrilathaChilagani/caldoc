import Link from "next/link";
import { redirect } from "next/navigation";
import { requireNgoSession } from "@/lib/auth.server";

const SUPPORT_EMAIL = process.env.NGO_SUPPORT_EMAIL || "support@caldoc.in";

export const metadata = {
  title: "Create NGO booking | CalDoc",
};

export default async function NgoNewBookingPage() {
  const session = await requireNgoSession();
  if (!session) {
    redirect(`/ngo/login?next=${encodeURIComponent("/ngo/appointments/new")}`);
  }

  return (
    <main className="bg-slate-50/70 min-h-screen py-12">
      <div className="mx-auto max-w-3xl space-y-8 rounded-[32px] bg-white p-10 shadow-lg ring-1 ring-slate-100">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">NGO bookings</p>
          <h1 className="text-3xl font-semibold text-slate-900">Need to hold a new slot?</h1>
          <p className="text-sm text-slate-600">
            We&apos;re still finishing self-serve NGO bookings inside this portal. In the meantime please share the details with the CalDoc coordination desk so that our ops team can block the right provider and slot for your beneficiary.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-100 bg-slate-50/80 p-6 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">How to request a booking today</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            <li>
              Pick a doctor and convenient slot from the {" "}
              <Link href="/providers" className="font-semibold text-blue-600 hover:text-blue-800">
                doctor directory
              </Link>
              .
            </li>
            <li>
              Email the patient and slot information to {" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue-600 hover:text-blue-800">
                {SUPPORT_EMAIL}
              </a>{" "}
              or message the CalDoc ops WhatsApp contact.
            </li>
            <li>
              Our team will create the reservation and you&apos;ll see it in the dashboard within a few minutes. Confirmation and video links continue to go out automatically to the patient and provider.
            </li>
          </ol>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=New%20NGO%20booking%20request`}
            className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Email CalDoc operations
          </a>
          <Link
            href="/ngo/appointments"
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Back to appointments
          </Link>
        </div>
      </div>
    </main>
  );
}
