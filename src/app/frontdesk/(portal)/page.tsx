import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FrontDeskDashboard() {
  const sess = await requireFrontDeskSession();
  if (!sess) redirect("/frontdesk/login");

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [
    todayTotal,
    todayConfirmed,
    pendingAppts,
    labUnassigned,
    rxUnassigned,
    rxInFlight,
  ] = await Promise.all([
    prisma.appointment.count({ where: { slot: { startsAt: { gte: todayStart, lte: todayEnd } } } }),
    prisma.appointment.count({ where: { status: "CONFIRMED", slot: { startsAt: { gte: todayStart, lte: todayEnd } } } }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.labOrder.count({ where: { labPartnerId: null, status: { notIn: ["CANCELLED", "COMPLETED"] } } }),
    prisma.rxOrder.count({ where: { pharmacyPartnerId: null, status: { notIn: ["CANCELLED", "DELIVERED"] } } }),
    prisma.rxOrder.count({ where: { status: { in: ["PAID", "PROCESSING", "DISPATCHED"] } } }),
  ]);

  const kpis = [
    { label: "Today's appointments", value: todayTotal, href: "/frontdesk/appointments", color: "text-[#2f6ea5]" },
    { label: "Confirmed today",       value: todayConfirmed, href: "/frontdesk/appointments", color: "text-emerald-600" },
    { label: "Pending confirmation",  value: pendingAppts, href: "/frontdesk/appointments", color: "text-amber-600" },
    { label: "Labs unassigned",       value: labUnassigned, href: "/frontdesk/labs", color: "text-violet-600" },
    { label: "Rx unassigned",         value: rxUnassigned,  href: "/frontdesk/rx-orders", color: "text-rose-600" },
    { label: "Rx in-flight",          value: rxInFlight,    href: "/frontdesk/rx-orders", color: "text-slate-700" },
  ];

  const quickLinks = [
    { href: "/frontdesk/calendar",     label: "Calendar",       desc: "Day / week / month view" },
    { href: "/frontdesk/appointments", label: "Appointments",   desc: "Reschedule or confirm" },
    { href: "/frontdesk/labs",         label: "Lab orders",     desc: "Assign labs & update status" },
    { href: "/frontdesk/rx-orders",    label: "Pharmacy / Rx",  desc: "Assign pharmacy & track orders" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Good day</h1>
        <p className="mt-1 text-sm text-slate-500">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm transition hover:shadow-md"
          >
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-semibold ${k.color}`}>{k.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] transition hover:shadow-lg"
          >
            <p className="font-semibold text-slate-900">{q.label}</p>
            <p className="mt-1 text-sm text-slate-500">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
