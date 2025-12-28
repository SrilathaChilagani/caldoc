// src/app/patient/login/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { readPatientPhone } from "@/lib/patientAuth.server";
import LoginClient from "./ui/LoginClient";

type SearchParams = {
  next?: string;
  phone?: string;
};

export default async function PatientLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const phone = await readPatientPhone();
  const sp = await searchParams;
  const next = sp?.next || "/patient/appointments";
  const initialPhone = sp?.phone || "";

  if (phone) redirect(next);

  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#f7f9fc] py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 lg:flex-row">
        <section className="flex-1 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            TELEMEDICINE made simple
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Access your appointments, prescriptions, and uploads in one place.
          </h1>
          <p className="text-base text-slate-600">
            Sign in with your registered mobile number. We&apos;ll keep you logged in on this device so you can review
            visit notes, download receipts, and share documents securely with your doctor.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-semibold text-slate-900">Download receipts</p>
              <p className="text-xs text-slate-500">
                Capture payments and access receipt PDFs anytime.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-semibold text-slate-900">Upload documents</p>
              <p className="text-xs text-slate-500">
                Share lab reports securely with your provider before the visit.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            By continuing you agree to our{" "}
            <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-800">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-800">
              Privacy Policy
            </Link>
            . TELEMEDICINE services are not for emergency care.
          </p>
        </section>

        <section className="flex-1">
          <LoginClient next={next} initialPhone={initialPhone} />
        </section>
      </div>
    </main>
  );
}
