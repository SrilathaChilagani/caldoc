import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";
import ChangeNgoPasswordButton from "@/app/ngo/ChangePasswordButton";
import ReleaseReservationButton from "@/app/ngo/ReleaseReservationButton";
import EditReservationButton from "@/app/ngo/EditReservationButton";
import ConfirmPatientButton from "@/app/ngo/ConfirmPatientButton";

type PageProps = {
  searchParams?: Promise<{ start?: string; end?: string }>;
};

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

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function parseInputDate(input: string | undefined, fallback: Date) {
  if (!input) return fallback;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

export default async function NgoAppointmentsPage({ searchParams }: PageProps) {
  const session = await requireNgoSession();
  if (!session) {
    redirect(`/ngo/login?next=${encodeURIComponent("/ngo/appointments")}`);
  }

  const sp = await searchParams;

  const today = new Date();
  const defaultStart = startOfDay(today);
  const defaultEnd = endOfDay(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

  const startDate = startOfDay(parseInputDate(sp?.start, defaultStart));
  let endDate = endOfDay(parseInputDate(sp?.end, defaultEnd));
  if (endDate < startDate) {
    endDate = endOfDay(new Date(startDate));
  }

  const slotRangeFilter = {
    slot: {
      startsAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  } as const;

  const [
    ngo,
    totalReservations,
    confirmedCount,
    reservationAmountAgg,
    confirmedAmountAgg,
    appointments,
    heldReservations,
    heldReservationCount,
  ] = await Promise.all([
    prisma.ngo.findUnique({ where: { id: session.ngoId }, select: { name: true, slug: true } }),
    prisma.ngoReservation.count({
      where: { ngoId: session.ngoId, ...slotRangeFilter },
    }),
    prisma.appointment.count({
      where: { ngoReservation: { ngoId: session.ngoId }, status: "CONFIRMED", ...slotRangeFilter },
    }),
    prisma.ngoReservation.aggregate({
      where: { ngoId: session.ngoId, status: { not: "CANCELLED" }, ...slotRangeFilter },
      _sum: { amountPaise: true },
    }),
    prisma.appointment.aggregate({
      where: { ngoReservation: { ngoId: session.ngoId }, status: "CONFIRMED", ...slotRangeFilter },
      _sum: { feePaise: true },
    }),
    prisma.appointment.findMany({
      where: { ngoReservation: { ngoId: session.ngoId }, ...slotRangeFilter },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        feePaise: true,
        patientName: true,
        createdAt: true,
        provider: { select: { name: true, speciality: true } },
        slot: { select: { startsAt: true } },
        payment: { select: { receiptUrl: true } },
        prescription: { select: { pdfKey: true } },
        ngoReservation: { select: { friendlyId: true, status: true, id: true, amountPaise: true, notes: true } },
      },
    }),
    prisma.ngoReservation.findMany({
      where: { ngoId: session.ngoId, status: "HELD", appointmentId: null, ...slotRangeFilter },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        friendlyId: true,
        amountPaise: true,
        createdAt: true,
        notes: true,
        provider: { select: { name: true, speciality: true } },
        slot: { select: { startsAt: true } },
      },
    }),
    prisma.ngoReservation.count({
      where: { ngoId: session.ngoId, status: "HELD", appointmentId: null, ...slotRangeFilter },
    }),
  ]);

  const specialityBreakdown = await prisma.ngoReservation
    .groupBy({
      by: ["speciality"],
      where: { ngoId: session.ngoId, ...slotRangeFilter },
      _count: { _all: true },
    })
    .then((rows) => rows.sort((a, b) => (b._count._all || 0) - (a._count._all || 0)));

  const startInputValue = startDate.toISOString().slice(0, 10);
  const endInputValue = endDate.toISOString().slice(0, 10);
  const rangeLabel = `${startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;

  const kpiCards = [
    { label: "Slots held", value: heldReservationCount, sub: "pending assignment" },
    { label: "Slots confirmed", value: confirmedCount, sub: "patients assigned" },
    { label: "Estimated charges", value: formatCurrency(reservationAmountAgg._sum.amountPaise || 0), sub: "based on held slots" },
    { label: "Confirmed charges", value: formatCurrency(confirmedAmountAgg._sum.feePaise || 0), sub: "actual utilized" },
  ];

  const cardCls =
    "rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-[0_4px_24px_rgba(47,110,165,0.08)] p-5";

  const thCls = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
  const tdCls = "px-3 py-3 align-middle";

  return (
    <main className="min-h-screen bg-[#f7f2ea] py-10">
      {/* Header */}
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">NGO dashboard</p>
          <h1 className="mt-0.5 text-3xl font-semibold text-slate-900">{ngo?.name || "Your NGO"}</h1>
          <p className="mt-1 text-sm text-slate-600">Track every appointment booked under your programmes.</p>
          <p className="mt-0.5 text-xs text-slate-500">Showing reservations between {rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/ngo/appointments/new"
            className="rounded-full border border-[#2f6ea5]/40 px-4 py-2 text-sm font-semibold text-[#2f6ea5] transition hover:bg-[#2f6ea5]/5"
          >
            + New booking
          </Link>
          <a
            href={`/api/ngo/invoice?start=${startInputValue}&end=${endInputValue}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#2f6ea5]/40 px-4 py-2 text-sm font-semibold text-[#2f6ea5] transition hover:bg-[#2f6ea5]/5"
          >
            Download invoice
          </a>
          <ChangeNgoPasswordButton />
          <form action="/api/ngo/logout" method="POST">
            <button
              type="submit"
              className="rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#255b8b]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={cardCls}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {typeof card.value === "number" ? card.value.toLocaleString("en-IN") : card.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Date range filter */}
      <div className="mx-auto mt-6 max-w-6xl px-6">
        <form className={`flex flex-col gap-4 sm:flex-row sm:items-end ${cardCls}`}>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600" htmlFor="start-date">
              From
            </label>
            <input
              id="start-date"
              type="date"
              name="start"
              defaultValue={startInputValue}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600" htmlFor="end-date">
              To
            </label>
            <input
              id="end-date"
              type="date"
              name="end"
              defaultValue={endInputValue}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#255b8b]"
          >
            Update range
          </button>
        </form>
      </div>

      {/* Specialty breakdown */}
      <div className="mx-auto mt-6 max-w-6xl px-6">
        <div className={cardCls}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Specialty breakdown</h2>
              <p className="text-xs text-slate-500">Counts of slots held within the selected range.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Specialty</th>
                  <th className={`${thCls} text-right`}>Reservations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specialityBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-sm text-slate-400">
                      No reservations within this date range.
                    </td>
                  </tr>
                )}
                {specialityBreakdown.map((row) => (
                  <tr key={row.speciality ?? "unknown"} className="text-slate-700">
                    <td className={tdCls}>{row.speciality || "Unspecified"}</td>
                    <td className={`${tdCls} text-right font-semibold`}>{row._count._all}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Held reservations */}
      <div className="mx-auto mt-6 max-w-6xl px-6">
        <div className={cardCls}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Held reservations</h2>
              <p className="text-xs text-slate-500">
                Slots you&apos;re holding — assign a patient when they arrive, or release unused slots.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {heldReservationCount} pending
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Booking ID</th>
                  <th className={thCls}>Provider</th>
                  <th className={thCls}>Specialty</th>
                  <th className={thCls}>Slot time</th>
                  <th className={`${thCls} text-right`}>Est. amount</th>
                  <th className={thCls}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heldReservations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                      No held reservations at the moment.
                    </td>
                  </tr>
                )}
                {heldReservations.map((reservation) => (
                  <tr key={reservation.id} className="text-slate-700">
                    <td className={`${tdCls} font-mono text-xs text-slate-500`}>{reservation.friendlyId}</td>
                    <td className={tdCls}>{reservation.provider?.name || "Unassigned"}</td>
                    <td className={tdCls}>
                      <span className="rounded-full bg-[#2f6ea5]/10 px-2 py-0.5 text-xs font-medium text-[#2f6ea5]">
                        {reservation.provider?.speciality || "—"}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-xs`}>{formatSlot(reservation.slot?.startsAt ?? null)}</td>
                    <td className={`${tdCls} text-right font-semibold`}>{formatCurrency(reservation.amountPaise)}</td>
                    <td className={`${tdCls} space-y-1.5`}>
                      <ConfirmPatientButton
                        reservationId={reservation.id}
                        friendlyId={reservation.friendlyId ?? ""}
                        providerName={reservation.provider?.name ?? "Provider"}
                        slotTime={formatSlot(reservation.slot?.startsAt ?? null)}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <EditReservationButton
                          reservationId={reservation.id}
                          initialAmountPaise={reservation.amountPaise}
                          initialNotes={reservation.notes || ""}
                        />
                        <ReleaseReservationButton reservationId={reservation.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmed appointments */}
      <div className="mx-auto mt-6 max-w-6xl px-6 pb-10">
        <div className={cardCls}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Confirmed appointments</h2>
              <p className="text-xs text-slate-500">Slots with patients assigned — showing up to 100 bookings.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {confirmedCount} confirmed
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Booking ID</th>
                  <th className={thCls}>Patient</th>
                  <th className={thCls}>Provider</th>
                  <th className={thCls}>Speciality</th>
                  <th className={thCls}>Slot</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Amount</th>
                  <th className={thCls}>Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">
                      No confirmed bookings yet. Assign patients to your held slots above.
                    </td>
                  </tr>
                )}
                {appointments.map((appt) => (
                  <tr key={appt.id} className="text-slate-700">
                    <td className={`${tdCls} font-mono text-xs text-slate-500`}>
                      {appt.ngoReservation?.friendlyId || "—"}
                    </td>
                    <td className={tdCls}>
                      <span className="font-medium text-slate-800">{appt.patientName || "—"}</span>
                    </td>
                    <td className={tdCls}>{appt.provider?.name || "Unassigned"}</td>
                    <td className={tdCls}>
                      <span className="rounded-full bg-[#2f6ea5]/10 px-2 py-0.5 text-xs font-medium text-[#2f6ea5]">
                        {appt.provider?.speciality || "—"}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-xs`}>{formatSlot(appt.slot?.startsAt)}</td>
                    <td className={tdCls}>
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
                    <td className={`${tdCls} text-right font-semibold`}>{formatCurrency(appt.feePaise)}</td>
                    <td className={`${tdCls} space-y-1 text-xs`}>
                      <div>
                        <Link
                          href={`/visit/${appt.id}`}
                          className="text-[#2f6ea5] underline-offset-2 hover:underline"
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
                            className="text-[#2f6ea5] underline-offset-2 hover:underline"
                          >
                            Receipt
                          </a>
                        </div>
                      )}
                      {appt.prescription?.pdfKey && (
                        <div>
                          <Link
                            href={`/api/appointments/${appt.id}/prescription.pdf`}
                            className="text-[#2f6ea5] underline-offset-2 hover:underline"
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
