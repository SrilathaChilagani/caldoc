"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string; exact?: boolean };
type NavSection = { group: string; links: NavLink[] };

const nav: NavSection[] = [
  {
    group: "Overview",
    links: [{ href: "/admin", label: "Dashboard", exact: true }],
  },
  {
    group: "Appointments",
    links: [
      { href: "/admin/appointments", label: "All appointments" },
      { href: "/admin/checkin-preview", label: "Check-in form" },
      { href: "/admin/ngo", label: "NGO bookings" },
    ],
  },
  {
    group: "Providers",
    links: [
      { href: "/admin/providers", label: "All providers" },
      { href: "/admin/enrollments", label: "Enrollments" },
      { href: "/admin/providers/onboard", label: "Onboard" },
      { href: "/admin/providers/offboard", label: "Off-board" },
      { href: "/admin/slots", label: "Schedule slots" },
    ],
  },
  {
    group: "Pharmacy",
    links: [
      { href: "/admin/pharmacy-partners", label: "All pharmacies" },
      { href: "/admin/pharmacy-partners/onboard", label: "Onboard pharmacy" },
      { href: "/admin/rx-orders", label: "Rx orders" },
      { href: "/admin/enrollments/pharmacy", label: "Pharmacy enrollments" },
    ],
  },
  {
    group: "Labs",
    links: [
      { href: "/admin/lab-partners", label: "All labs" },
      { href: "/admin/lab-partners/onboard", label: "Onboard lab" },
      { href: "/admin/labs", label: "Lab orders" },
      { href: "/admin/enrollments/labs", label: "Lab enrollments" },
    ],
  },
  {
    group: "Teams",
    links: [
      { href: "/admin/pharmacy-users", label: "Pharmacy team" },
      { href: "/admin/lab-users", label: "Lab team" },
    ],
  },
  {
    group: "Patients",
    links: [
      { href: "/admin/patients", label: "All patients" },
    ],
  },
  {
    group: "Front Desk",
    links: [
      { href: "/frontdesk", label: "Dashboard", exact: true },
      { href: "/frontdesk/calendar", label: "Calendar" },
      { href: "/frontdesk/appointments", label: "Appointments" },
      { href: "/frontdesk/labs", label: "Lab orders" },
      { href: "/frontdesk/rx-orders", label: "Pharmacy / Rx" },
    ],
  },
  {
    group: "System",
    links: [
      { href: "/admin/whatsapp", label: "WhatsApp" },
      { href: "/admin/audit-logs", label: "Audit log" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLoginPage = path === "/admin/login";

  function isActive(link: NavLink) {
    return link.exact
      ? path === link.href
      : path === link.href || (path.startsWith(link.href + "/") && link.href !== "/admin");
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen -mt-16 bg-gray-100 text-slate-900">
        <div className="pt-20 pb-10 px-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 text-slate-900" style={{ paddingTop: "4rem" }}>

      {/* ── Sidebar ── */}
      {/* top-16 = 64 px = global nav height; h-[calc(100vh-4rem)] fills the rest */}
      <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 flex-col sticky top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 overflow-y-auto z-10">
        {/* Brand + portal label */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2f6ea5]">CalDoc</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">Admin Portal</p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {nav.map((section) => (
            <div key={section.group}>
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {section.group}
              </p>
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const active = isActive(link);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#2f6ea5]/10 text-[#2f6ea5]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-slate-100">
          <form action="/provider/logout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar (shown only on small screens where sidebar is hidden) */}
        <div className="lg:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Admin Portal</p>
          <form action="/provider/logout" method="post">
            <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
              Sign out
            </button>
          </form>
        </div>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
