import Link from "next/link";
import { requireFrontDeskSession, readAdminSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";

const NAV = [
  {
    section: "Overview",
    items: [{ href: "/frontdesk", label: "Dashboard" }],
  },
  {
    section: "Scheduling",
    items: [
      { href: "/frontdesk/calendar", label: "Calendar" },
      { href: "/frontdesk/appointments", label: "Appointments" },
    ],
  },
  {
    section: "Orders",
    items: [
      { href: "/frontdesk/labs", label: "Lab orders" },
      { href: "/frontdesk/rx-orders", label: "Pharmacy / Rx" },
    ],
  },
];

export default async function FrontDeskLayout({ children }: { children: React.ReactNode }) {
  const sess = await requireFrontDeskSession();
  if (!sess) redirect("/frontdesk/login");

  const adminSess = await readAdminSession();
  const isAdmin = !!adminSess;

  return (
    <div className="flex min-h-screen bg-[#f7f2ea] text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex">
        <div className="flex h-14 items-center border-b border-slate-100 px-5">
          <span className="font-semibold text-[#2f6ea5]">CalDoc</span>
          <span className="ml-2 rounded-full bg-[#e7edf3] px-2 py-0.5 text-xs font-medium text-[#2f6ea5]">
            Front desk
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-4">
              <p className="mb-1 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.section}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4 space-y-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex w-full items-center justify-center rounded-full border border-[#2f6ea5]/40 py-1.5 text-sm font-medium text-[#2f6ea5] hover:bg-[#e7edf3]"
            >
              ← Back to Admin
            </Link>
          )}
          <form action="/api/frontdesk/logout" method="POST">
            <button
              type="submit"
              className="w-full rounded-full border border-slate-200 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden">
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/80 px-4 py-2 text-sm backdrop-blur">
          <span className="mr-3 font-semibold text-[#2f6ea5]">Front desk</span>
          {NAV.flatMap((g) => g.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-1 font-medium text-slate-600 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full border border-[#2f6ea5]/40 px-3 py-1 text-xs font-medium text-[#2f6ea5] hover:bg-[#e7edf3]"
              >
                ← Admin
              </Link>
            )}
            <form action="/api/frontdesk/logout" method="POST">
              <button type="submit" className="rounded-full px-3 py-1 text-sm text-slate-500">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
