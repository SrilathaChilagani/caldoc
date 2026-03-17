import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RescheduleModal from "./RescheduleModal";
import ProviderFilter from "./ProviderFilter";

export const dynamic = "force-dynamic";

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", weekday: "short", day: "numeric",
  month: "short", hour: "numeric", minute: "2-digit", hour12: true,
});

const STATUS_CHIP: Record<string, string> = {
  CONFIRMED:   "bg-emerald-50 text-emerald-700",
  PENDING:     "bg-amber-50  text-amber-700",
  RESCHEDULED: "bg-blue-50   text-blue-700",
  NO_SHOW:     "bg-rose-50   text-rose-700",
  CANCELLED:   "bg-slate-100 text-slate-500",
  CANCELED:    "bg-slate-100 text-slate-500",
};

type PageProps = { searchParams?: Promise<{ [key: string]: string | undefined }> };

export default async function FrontDeskAppointments({ searchParams }: PageProps) {
  const sess = await requireFrontDeskSession();
  if (!sess) redirect("/frontdesk/login");

  const sp = (await searchParams) ?? {};
  const providerFilter = sp.provider || "";
  const statusFilter   = (sp.status || "").toUpperCase();

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(providerFilter ? { providerId: providerFilter } : {}),
      ...(statusFilter && statusFilter !== "ALL"
        ? statusFilter === "CANCELLED"
          ? { status: { in: ["CANCELLED", "CANCELED"] } }
          : { status: statusFilter }
        : {}),
    },
    include: { patient: true, provider: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
    take: 200,
  });

  // Available slots per provider for reschedule (future, unbooked)
  const freeSlots = await prisma.slot.findMany({
    where: { isBooked: false, startsAt: { gte: now } },
    select: { id: true, providerId: true, startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
    take: 1000,
  });

  const STATUSES = ["ALL", "CONFIRMED", "PENDING", "RESCHEDULED", "CANCELLED", "NO_SHOW"];

  function mkHref(params: Record<string, string>) {
    const p = new URLSearchParams({ ...(providerFilter ? { provider: providerFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...params });
    const s = p.toString();
    return s ? `/frontdesk/appointments?${s}` : "/frontdesk/appointments";
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold text-slate-900">Appointments</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-5 py-4 shadow-sm">
        <ProviderFilter
          providers={providers}
          current={providerFilter}
          statusFilter={statusFilter}
        />
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold uppercase tracking-wide">
          {STATUSES.map(s => (
            <Link
              key={s}
              href={mkHref({ status: s === "ALL" ? "" : s })}
              className={`rounded-full px-3 py-1 ${
                (statusFilter || "ALL") === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ").toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No appointments found.</td></tr>
              )}
              {appointments.map(appt => (
                <tr key={appt.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {appt.slot ? IST.format(appt.slot.startsAt) : "—"}
                    </div>
                    <div className="font-mono text-xs text-slate-400">{appt.id.slice(0, 12)}…</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{appt.patientName || appt.patient?.name || "—"}</div>
                    <div className="text-xs text-slate-400">{appt.patient?.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{appt.provider?.name || "—"}</div>
                    <div className="text-xs text-slate-400">{appt.provider?.speciality}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[appt.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {appt.slot && !["CANCELLED","CANCELED","COMPLETED"].includes(appt.status) && (
                        <RescheduleModal
                          appointmentId={appt.id}
                          patientName={appt.patientName || appt.patient?.name || "Patient"}
                          providerName={appt.provider?.name || ""}
                          providerId={appt.providerId}
                          currentSlotId={appt.slotId}
                          currentSlotStartsAt={appt.slot.startsAt.toISOString()}
                          freeSlots={freeSlots
                            .filter(s => s.providerId === appt.providerId)
                            .map(s => ({id:s.id,startsAt:s.startsAt.toISOString(),endsAt:s.endsAt.toISOString()}))}
                        />
                      )}
                      <Link href={`/admin/appointments/${appt.id}`} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-slate-400">Showing up to 200 appointments, sorted by slot time.</p>
      </div>
    </div>
  );
}
