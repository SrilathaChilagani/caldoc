"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PatientMobileTabs() {
  const path = usePathname();

  const active = (p: string) =>
    path.startsWith(p)
      ? "text-[#2f6ea5] font-semibold"
      : "text-slate-500";

  return (
    <div className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-slate-200 bg-white p-3 text-sm text-slate-600 md:hidden">
      <Link href="/patient/appointments" className={active("/patient/appointments")}>
        Appointments
      </Link>
      <Link href="/patient/pharmacy" className={active("/patient/pharmacy")}>
        Pharmacy
      </Link>
      <Link href="/patient/labs" className={active("/patient/labs")}>
        Labs
      </Link>

      <a href="/api/patient/logout" className="text-rose-500 font-medium">
        Sign out
      </a>
    </div>
  );
}
