import Link from "next/link";

const NAV = [
  { href: "/provider/appointments", label: "Appointments" },
  { href: "/provider/calendar",     label: "Calendar", icon: true },
  { href: "/provider/schedule",     label: "Manage slots" },
  { href: "/provider/settings",     label: "Settings" },
];

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f2ea] text-slate-900">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2 sm:px-6">
          <span className="mr-4 text-sm font-semibold text-[#2f6ea5]">Provider portal</span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.icon && (
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              )}
              {item.label}
            </Link>
          ))}
          <div className="ml-auto">
            <form action="/provider/logout" method="POST">
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
