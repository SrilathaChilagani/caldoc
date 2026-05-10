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

const allLinks = nav.flatMap((s) => s.links);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLoginPage = path === "/admin/login";

  function isActive(link: NavLink) {
    return link.exact
      ? path === link.href
      : path === link.href || (path.startsWith(link.href + "/") && link.href !== "/admin");
  }

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 text-slate-900">
      <div className="pt-20 pb-10">
        {!isLoginPage && (
          <div className="px-6 lg:px-16 xl:px-24 mb-6">
            {/* Portal header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">CalDoc</h2>
                <h1 className="text-2xl font-semibold text-slate-900">Admin Portal</h1>
              </div>
              <form action="/provider/logout" method="post">
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  Sign out
                </button>
              </form>
            </div>

            {/* Horizontal scrollable nav */}
            <div className="flex flex-wrap gap-2">
              {allLinks.map((link) => {
                const active = isActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? "bg-[#2f6ea5] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <main className="px-6 lg:px-16 xl:px-24 space-y-6">{children}</main>
      </div>
    </div>
  );
}
