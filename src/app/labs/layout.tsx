"use client";

import { usePathname } from "next/navigation";

export default function LabsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLoginPage = path === "/labs/login";

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 text-slate-900">
      <div className="pt-20 pb-10 px-6 lg:px-16 xl:px-24">
        {!isLoginPage && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">CalDoc</h2>
            <h1 className="text-2xl font-semibold text-slate-900">Labs Portal</h1>
          </div>
        )}
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
