// src/app/patient/login/page.tsx
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
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7f2ea] px-4 py-16">
      <div className="w-full max-w-md">
        <LoginClient next={next} initialPhone={initialPhone} />
      </div>
    </main>
  );
}
