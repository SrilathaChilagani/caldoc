"use client";

import { usePathname } from "next/navigation";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLoginPage = path === "/pharmacy/login";

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 text-slate-900">
      <div className="pt-20 pb-10 px-6 lg:px-16 xl:px-24">
        {!isLoginPage && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">CalDoc</h2>
              <h1 className="text-2xl font-semibold text-slate-900">Pharmacy Portal</h1>
            </div>
            <form method="POST" action="/api/pharmacy/logout">
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
