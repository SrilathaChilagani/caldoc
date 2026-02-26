import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { formatINR } from "@/lib/format";
import OfflineRequestActions from "./OfflineRequestActions";
import AdminNgoReservationActions from "./AdminNgoReservationActions";

export const dynamic = "force-dynamic";

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const portalCards = [
  { label: "Teleconsultations", desc: "Manage & reassign appointments", href: "/admin/appointments", bar: "bg-[#2f6ea5]" },
  { label: "Rx Delivery", desc: "Track and fulfil prescription orders", href: "/admin/rx-orders", bar: "bg-emerald-600" },
  { label: "Labs", desc: "Lab orders and status updates", href: "/admin/labs", bar: "bg-violet-600" },
  { label: "NGO Bookings", desc: "Confirm or release NGO reservations", href: "/admin/ngo", bar: "bg-amber-600" },
  { label: "Providers", desc: "Onboard, off-board, manage doctors", href: "/admin/providers", bar: "bg-slate-700" },
  { label: "Enrollments", desc: "Review & approve provider applications", href: "/admin/enrollments", bar: "bg-orange-500" },
  { label: "Pharmacy Team", desc: "Add or remove pharmacy users", href: "/admin/pharmacy-users", bar: "bg-teal-600" },
  { label: "Lab Team", desc: "Add or remove lab users", href: "/admin/lab-users", bar: "bg-rose-600" },
  { label: "Schedule Slots", desc: "Generate availability for providers", href: "/admin/slots", bar: "bg-indigo-600" },
  { label: "WhatsApp", desc: "Diagnostics, message log & test sends", href: "/admin/whatsapp", bar: "bg-green-600" },
  { label: "Check-in Form", desc: "Preview the patient pre-visit form", href: "/admin/checkin-preview", bar: "bg-cyan-600" },
  { label: "Patients", desc: "Search and review registered patients", href: "/admin/patients", bar: "bg-pink-600" },
  { label: "Audit log", desc: "System-wide action trail", href: "/admin/audit-logs", bar: "bg-slate-500" },
];

export default async function AdminDashboard() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin");

  const [
    paymentSummary,
    appointmentCounts,
    rxOrderCounts,
    labOrderCounts,
    providerCount,
    ngoReservations,
    recentOfflineRequests,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "CAPTURED" } }),
    prisma.appointment.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.rxOrder.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.labOrder.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.provider.count({ where: { isActive: true } }),
    prisma.ngoReservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        ngo: { select: { name: true } },
        provider: { select: { name: true, speciality: true } },
        slot: { select: { startsAt: true } },
      },
    }),
    prisma.offlineRequest.findMany({
      where: { status: { not: "RESOLVED" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const paymentsTotal = paymentSummary._sum.amount ?? 0;
  const countsMap = new Map(appointmentCounts.map((c) => [c.status, c._count.status]));
  const confirmedCount = countsMap.get("CONFIRMED") || 0;
  const pendingCount = countsMap.get("PENDING") || 0;
  const cancelledCount = (countsMap.get("CANCELLED") || 0) + (countsMap.get("CANCELED") || 0);
  const totalAppts = appointmentCounts.reduce((s, c) => s + c._count.status, 0);

  const rxMap = new Map(rxOrderCounts.map((c) => [c.status, c._count.status]));
  const rxPaid = rxMap.get("PAID") || 0;
  const rxPending = rxMap.get("AWAITING_PAYMENT") || 0;
  const rxTotal = rxOrderCounts.reduce((s, c) => s + c._count.status, 0);

  const labMap = new Map(labOrderCounts.map((c) => [c.status, c._count.status]));
  const labConfirmed = labMap.get("CONFIRMED") || 0;
  const labPending = (labMap.get("PENDING") || 0) + (labMap.get("AWAITING_PAYMENT") || 0);
  const labTotal = labOrderCounts.reduce((s, c) => s + c._count.status, 0);

  const kpis = [
    { label: "Revenue captured", value: formatINR(paymentsTotal), sub: "across all portals" },
    { label: "Appointments", value: totalAppts, sub: `${confirmedCount} confirmed · ${pendingCount} pending` },
    { label: "Cancelled", value: cancelledCount, sub: "appointments" },
    { label: "Active providers", value: providerCount, sub: "on marketplace" },
    { label: "Rx orders", value: rxTotal, sub: `${rxPaid} paid · ${rxPending} awaiting` },
    { label: "Lab orders", value: labTotal, sub: `${labConfirmed} confirmed · ${labPending} pending` },
  ];

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Unified operations view — teleconsultations, pharmacy, labs, NGO, and providers.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{k.value}</p>
            <p className="text-[11px] text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Portal quick-access */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-slate-900">Portal sections</h2>
        <p className="text-sm text-slate-500">Jump to any operational area.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {portalCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] transition-shadow hover:shadow-[0_8px_30px_-4px_rgba(88,110,132,0.25)]"
            >
              <div className={`mb-3 h-1.5 w-8 rounded-full ${card.bar}`} />
              <p className="font-semibold text-slate-900">{card.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{card.desc}</p>
              <span className="absolute right-4 top-4 text-slate-300 transition-colors group-hover:text-[#2f6ea5]">→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* NGO reservations */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">Recent NGO bookings</h2>
            <p className="text-xs text-slate-500">
              Latest 10 ·{" "}
              <Link href="/admin/ngo" className="text-[#2f6ea5] hover:underline">View all</Link>
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {["ID", "NGO", "Doctor", "Slot", "Status", "Actions"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ngoReservations.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">No reservations yet.</td></tr>
              ) : (
                ngoReservations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-slate-700">{r.friendlyId}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{r.ngo?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-900">{r.provider.name}</div>
                      <div className="text-xs text-slate-400">{r.provider.speciality}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {r.slot?.startsAt ? formatIST(r.slot.startsAt) : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-600">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <AdminNgoReservationActions
                        reservationId={r.id}
                        status={r.status}
                        friendlyId={r.friendlyId}
                        amountPaise={r.amountPaise}
                        notes={r.notes}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Telephonic queue */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="mb-4">
          <h2 className="font-serif text-lg font-semibold text-slate-900">Telephonic queue</h2>
          <p className="text-xs text-slate-500">Unresolved offline requests from low-bandwidth patients.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {["Created", "Patient", "Speciality", "Status", "Actions"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOfflineRequests.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">Queue is clear.</td></tr>
              ) : (
                recentOfflineRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-slate-400">{formatIST(req.createdAt)}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-slate-900">{req.name}</div>
                      <div className="text-xs text-slate-400">{req.phone}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">{req.speciality || "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-600">
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2.5"><OfflineRequestActions requestId={req.id} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
