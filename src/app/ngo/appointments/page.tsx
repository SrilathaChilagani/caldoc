import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

function formatCurrency(paise?: number | null) {
  if (!paise || Number.isNaN(paise)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

function formatSlot(date?: Date | null) {
  if (!date) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function NgoAppointmentsPage() {
  const session = await requireNgoSession();
  if (!session) {
    redirect(`/ngo/login?next=${encodeURIComponent("/ngo/appointments")}`);
  }

  const [ngo, totalReservations, confirmedCount, pendingCount, amountAgg, appointments] = await Promise.all([
    prisma.ngo.findUnique({ where: { id: session.ngoId }, select: { name: true, slug: true } }),
    prisma.ngoReservation.count({ where: { ngoId: session.ngoId } }),
    prisma.appointment.count({ where: { ngoReservation: { ngoId: session.ngoId }, status: "CONFIRMED" } }),
    prisma.appointment.count({
      where: {
        ngoReservation: { ngoId: session.ngoId },
        status: { in: ["PENDING", "HELD", "HOLD"] },
      },
    }),
    prisma.appointment.aggregate({
      where: { ngoReservation: { ngoId: session.ngoId } },
      _sum: { feePaise: true },
    }),
    prisma.appointment.findMany({
      where: { ngoReservation: { ngoId: session.ngoId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        feePaise: true,
        createdAt: true,
        provider: { select: { name: true, speciality: true } },
        slot: { select: { startsAt: true } },
        payment: { select: { receiptUrl: true } },
        prescription: { select: { pdfKey: true } },
        ngoReservation: { select: { friendlyId: true, status: true } },
      },
    }),
  ]);

  const totalAmountLabel = formatCurrency(amountAgg._sum.feePaise || 0);

  const cards = [
    { label: "Total reservations", value: totalReservations },
    { label: "Confirmed", value: confirmedCount },
    { label: "Pending", value: pendingCount },
    { label: "Amount reserved", value: totalAmountLabel },
  ];

  return (
    <main className="bg-slate-50/70 min-h-screen py-10">
      <div className="mx-auto flex max-w-6xl items-start justify-between px-6 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">NGO dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">{ngo?.name || "Your NGO"}</h1>
          <p className="text-sm text-slate-600">Track every appointment booked under your programmes.</p>
        </div>
        <form action="/api/ngo/logout" method="POST" className="flex items-center gap-3">
          <Link
            href="/ngo/appointments/new"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            + New booking
          </Link>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {typeof card.value === "number" ? card.value.toLocaleString("en-IN") : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent appointments</h2>
              <p className="text-sm text-slate-500">Showing up to 100 latest bookings.</p>
            </div>
            <p className="text-xs text-slate-500">Friendly IDs help match your internal rosters.</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Friendly ID</th>
                  <th className="px-3 py-2">Appointment</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Speciality</th>
                  <th className="px-3 py-2">Slot</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                      No bookings yet. Use the New booking button to hold slots for your beneficiaries.
                    </td>
                  </tr>
                )}
                {appointments.map((appt) => (
                  <tr key={appt.id} className="text-slate-700">
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{appt.ngoReservation?.friendlyId || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{appt.id}</td>
                    <td className="px-3 py-3">{appt.provider?.name || "Unassigned"}</td>
                    <td className="px-3 py-3">{appt.provider?.speciality || "—"}</td>
                    <td className="px-3 py-3">{formatSlot(appt.slot?.startsAt)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          appt.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700"
                            : appt.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{formatCurrency(appt.feePaise)}</td>
                    <td className="px-3 py-3 space-y-1 text-xs">
                      <div>
                        <Link
                          href={`/visit/${appt.id}`}
                          className="text-slate-600 underline-offset-2 hover:underline"
                        >
                          Visit link
                        </Link>
                      </div>
                      {appt.payment?.receiptUrl && (
                        <div>
                          <a
                            href={appt.payment.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-600 underline-offset-2 hover:underline"
                          >
                            Receipt
                          </a>
                        </div>
                      )}
                      {appt.prescription?.pdfKey && (
                        <div>
                          <Link
                            href={`/api/appointments/${appt.id}/prescription.pdf`}
                            className="text-slate-600 underline-offset-2 hover:underline"
                          >
                            Prescription
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
