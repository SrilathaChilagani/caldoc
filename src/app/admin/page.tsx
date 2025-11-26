import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import OfflineRequestActions from "./OfflineRequestActions";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

const allowedStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];

export default async function AdminDashboard({ searchParams }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/provider/login?next=/admin");

  const sp = (await searchParams) || {};
  const statusFilter = allowedStatuses.includes((sp.status || "").toUpperCase())
    ? (sp.status || "").toUpperCase()
    : undefined;

  const paymentSummaryPromise = prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "CAPTURED" },
  });

  const appointmentCountsPromise = prisma.appointment.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const appointmentsPromise = prisma.appointment.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      patient: true,
      provider: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const offlineRequestsPromise = prisma.offlineRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const [
    paymentSummary,
    appointmentCounts,
    appointments,
    offlineRequests,
  ] = await Promise.all([
    paymentSummaryPromise,
    appointmentCountsPromise,
    appointmentsPromise,
    offlineRequestsPromise,
  ]);

  const paymentsTotal = paymentSummary._sum.amount ?? 0;
  const countsMap = new Map(appointmentCounts.map((c) => [c.status, c._count.status]));
  const confirmedCount = countsMap.get("CONFIRMED") || 0;
  const scheduledCount = confirmedCount + (countsMap.get("PENDING") || 0);
  const cancelledCount = countsMap.get("CANCELLED") || 0;
  const rescheduled = countsMap.get("RESCHEDULED") || 0;

  return (
    <>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Payments and appointment overview across the clinic.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Payments captured</p>
            <p className="text-2xl font-semibold text-slate-900">₹{(paymentsTotal / 100).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Scheduled</p>
            <p className="text-2xl font-semibold text-slate-900">{scheduledCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Confirmed</p>
            <p className="text-2xl font-semibold text-slate-900">{confirmedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Cancelled</p>
            <p className="text-2xl font-semibold text-slate-900">{cancelledCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Rescheduled</p>
            <p className="text-2xl font-semibold text-slate-900">{rescheduled}</p>
          </div>
        </div>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Appointments</h2>
          <form className="flex items-center gap-2" method="GET">
            <select
              name="status"
              defaultValue={statusFilter || ""}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm"
            >
              <option value="">All statuses</option>
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
            >
              Filter
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600">
            <thead>
              <tr className="bg-[#f2f5ff] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Rx delivery</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning>
              {appointments.map((ap) => (
                <tr key={ap.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-500">
                    {ap.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-3">{ap.provider?.name ?? "—"}</td>
                  <td className="px-4 py-3">{ap.patient?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {ap.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ap.payment?.receiptUrl ? (
                      <a
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        href={ap.payment.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View receipt
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ap.deliveryOpt ? (
                      <span className="text-sm capitalize text-slate-700">{ap.deliveryOpt}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      href={`/provider/appointments/${ap.id}?from=admin`}
                      target="_blank"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Offline requests</h2>
          <p className="text-xs text-slate-500">Telephonic queue for low-bandwidth patients.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600">
            <thead>
              <tr className="bg-[#f7f4ef] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Speciality</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offlineRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No offline requests at the moment.
                  </td>
                </tr>
              ) : (
                offlineRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {req.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{req.name}</div>
                    <div className="text-xs text-slate-500">{req.phone}</div>
                    {req.notes && <p className="mt-1 text-xs text-slate-400">{req.notes}</p>}
                  </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{req.speciality || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <OfflineRequestActions requestId={req.id} />
                    </td>
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
