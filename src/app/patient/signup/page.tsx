import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readPatientPhone } from "@/lib/patientAuth.server";
import SignupClient from "./SignupClient";

export default async function PatientSignupPage() {
  const phone = await readPatientPhone();
  if (phone) redirect("/patient/appointments");

  return (
    <main className="flex min-h-[90vh] items-center justify-center bg-[#f7f2ea] px-4 py-16">
      <div className="w-full max-w-lg">
        <Suspense fallback={<div className="rounded-2xl bg-white px-8 py-10 shadow-sm border border-white/70 text-center text-slate-400 text-sm">Loading…</div>}>
          <SignupClient />
        </Suspense>
      </div>
    </main>
  );
}
