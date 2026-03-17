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
      { href: "/admin/pharmacy-partners/onboard", label: "Onboard" },
      { href: "/admin/rx-orders", label: "Rx orders" },
      { href: "/admin/enrollments/pharmacy", label: "Pharmacy enrollments" },
    ],
  },
  {
    group: "Labs",
    links: [
      { href: "/admin/lab-partners", label: "All labs" },
      { href: "/admin/lab-partners/onboard", label: "Onboard" },
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
      { href: "/admin/audit-logs", label: "Audit log" },
    ],
  },
];

function NavSidebar({ path }: { path: string }) {
  return (
    <nav className="space-y-5">
      {nav.map((section) => (
        <div key={section.group}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.links.map((link) => {
              const active =
                link.exact
                  ? path === link.href
                  : path === link.href || (path.startsWith(link.href) && link.href !== "/admin");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#2f6ea5] text-white"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-[#f7f2ea] text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center px-4 sm:px-6">
          <div className="font-serif text-lg font-semibold text-[#2f6ea5]">CalDoc · Admin</div>
          <div className="ml-auto">
            <form action="/provider/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile nav pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        {nav.flatMap((s) => s.links).map((link) => {
          const active =
            link.exact
              ? path === link.href
              : path === link.href || (path.startsWith(link.href) && link.href !== "/admin");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-[#2f6ea5] text-white"
                  : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Body */}
      <div className="mx-auto flex max-w-screen-xl gap-6 px-4 py-8 sm:px-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-48 shrink-0 lg:block">
          <NavSidebar path={path} />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
