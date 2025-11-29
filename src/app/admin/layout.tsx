import Link from "next/link";

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/slots", label: "Slots" },
  { href: "/admin/providers/onboard", label: "Onboard" },
  { href: "/admin/providers/offboard", label: "Off-board" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
          <div className="text-lg font-semibold">Admin Portal</div>
          <div className="ml-auto flex items-center gap-4">
            <nav className="hidden gap-3 text-sm font-medium text-slate-600 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-transparent px-3 py-1 hover:border-blue-200 hover:text-blue-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <form action="/provider/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
