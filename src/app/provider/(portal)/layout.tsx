"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/provider/appointments", label: "Appointments" },
  { href: "/provider/calendar", label: "Calendar" },
  { href: "/provider/schedule", label: "Manage slots" },
  { href: "/provider/settings", label: "Settings" },
];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 text-slate-900">
      <div className="pt-20 pb-10 px-6 lg:px-16 xl:px-24">
        {/* Portal header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">CalDoc</h2>
            <h1 className="text-2xl font-semibold text-slate-900">Provider Portal</h1>
          </div>
          <form action="/provider/logout" method="POST">
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-2 mb-6">
          {NAV.map((item) => {
            const active = path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#2f6ea5] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
