import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireLabsSession } from "@/lib/auth.server";
import LabOrderActions from "./LabOrderActions";

const STATUS_LABELS = {
  AWAITING_PAYMENT: "Awaiting payment",
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  SAMPLE_COLLECTED: "Sample collected",
  PROCESSING: "Processing",
  READY: "Results ready",
} as const;

type StatusKey = keyof typeof STATUS_LABELS;

export const dynamic = "force-dynamic";

export default async function LabsDashboardPage() {
  const sess = await requireLabsSession();
  if (!sess) redirect("/labs/login?next=/labs");

  const orders = await prisma.labOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      appointment: {
        select: {
          id: true,
          provider: { select: { name: true, speciality: true } },
        },
      },
      patient: { select: { name: true, phone: true } },
    },
    take: 200,
  });

  const counts: Record<StatusKey, number> = {
    AWAITING_PAYMENT: 0,
    PENDING: 0,
    SCHEDULED: 0,
    SAMPLE_COLLECTED: 0,
    PROCESSING: 0,
    READY: 0,
  };

  const rows = orders.map((order) => {
    const status = (order.status?.toUpperCase() as StatusKey) || "PENDING";
    if (counts[status] !== undefined) counts[status] += 1;
    const appointment = order.appointment;
    return {
      id: order.id,
      tests: Array.isArray(order.tests) ? order.tests : (typeof order.tests === "string" ? [order.tests] : []),
      notes: order.notes,
      status,
      createdAt: order.createdAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      patientName: order.patientName || order.patient?.name || "—",
      patientPhone: order.patientPhone || order.patient?.phone || "—",
      providerName: appointment?.provider?.name ?? "—",
      providerSpeciality: appointment?.provider?.speciality ?? "—",
      appointmentId: appointment?.id ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Labs queue</h1>
            <p className="text-sm text-slate-500">
              Track lab orders created from provider visits and ad-hoc requests.
            </p>
          </div>
          <form action="/labs/logout" method="post">
            <input type="hidden" name="next" value="/labs/login" />
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
            >
              Log out
            </button>
          </form>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(STATUS_LABELS) as StatusKey[]).map((status) => (
            <div key={status} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-semibold text-slate-900">{counts[status]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent lab orders</h2>
          <p className="text-xs text-slate-500">Showing the last {rows.length} orders.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-[#eef3ff] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.createdAt}</div>
                    <div className="text-xs text-slate-500">Order ID: {row.id}</div>
                    {row.notes && <p className="text-xs text-slate-500">{row.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {row.tests && Array.isArray(row.tests) && row.tests.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
                        {row.tests.map((test: unknown, idx: number) => (
                          <li key={`${row.id}-test-${idx}`}>{String(test)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">No tests recorded</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.patientName}</div>
                    <div className="font-mono text-xs text-slate-500">{row.patientPhone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.providerName}</div>
                    <div className="text-xs text-slate-500">{row.providerSpeciality}</div>
                    {row.appointmentId && (
                      <Link
                        href={`/visit/${row.appointmentId}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View appointment
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {STATUS_LABELS[row.status]}
                    </div>
                    <LabOrderActions orderId={row.id} currentStatus={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
