import Link from "next/link";

const NAV = [
  { href: "/provider/appointments", label: "Appointments" },
  { href: "/provider/schedule", label: "Manage slots" },
  { href: "/provider/settings", label: "Settings" },
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
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
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
