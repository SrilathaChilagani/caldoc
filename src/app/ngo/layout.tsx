"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/ngo/appointments", label: "Appointments" },
  { href: "/ngo/appointments/new", label: "New booking" },
];

export default function NgoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLoginPage = path === "/ngo/login";

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 text-slate-900">
      <div className="pt-20 pb-10 px-6 lg:px-16 xl:px-24">
        {!isLoginPage && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">CalDoc</h2>
                <h1 className="text-2xl font-semibold text-slate-900">NGO Portal</h1>
              </div>
              <Link
                href="/ngo/login"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Sign out
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
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
          </div>
        )}
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
