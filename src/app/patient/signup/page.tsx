import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readPatientPhone } from "@/lib/patientAuth.server";
import SignupClient from "./SignupClient";

export default async function PatientSignupPage() {
  const phone = await readPatientPhone();
  if (phone) redirect("/patient/appointments");

  return (
    <main className="min-h-screen -mt-16 bg-gray-100 px-4 py-16">
      <div className="mx-auto w-full max-w-lg">
        <Suspense fallback={<p className="text-center text-slate-400 text-sm">Loading…</p>}>
          <SignupClient />
        </Suspense>
      </div>
    </main>
  );
}
