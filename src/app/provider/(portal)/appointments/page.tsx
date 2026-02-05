import { prisma } from "@/lib/db";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { readProviderSession } from "@/lib/auth.server";
import ProviderPhotoForm from "../ProviderPhotoForm";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const statusTabs = [
  { value: "ALL", label: "All appointments" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "RESCHEDULED", label: "Rescheduled" },
] as const;

const timeframeTabs = [
  { value: "ALLTIME", label: "All time" },
  { value: "LAST24", label: "Last 24h" },
  { value: "FUTURE", label: "Future" },
] as const;

type StatusValue = (typeof statusTabs)[number]["value"];

function isStatusValue(value: string): value is StatusValue {
  return statusTabs.some((tab) => tab.value === value);
}

function formatSlot(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ProviderAppointments({ searchParams }: PageProps) {
  const sess = await readProviderSession();
  if (!sess) {
    return (
      <main className="rounded-3xl bg-white p-10 text-center shadow-xl">
        <h1 className="text-xl font-semibold text-rose-600">Please sign in as a doctor</h1>
        <p className="mt-2 text-sm text-slate-500">Use your doctor credentials to access the portal.</p>
        <Link
          href="/provider/login?next=/provider/appointments"
          className="mt-6 inline-flex items-center rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to login
        </Link>
      </main>
    );
  }

  const provider = await prisma.provider.findUnique({
    where: { id: sess.pid },
    select: { id: true, name: true, slug: true, profilePhotoKey: true },
  });

  const sp = (await searchParams) ?? {};
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const timeframeParam = Array.isArray(sp.timeframe) ? sp.timeframe[0] : sp.timeframe;

  const requestedStatus = (statusParam || "").toUpperCase();
  const statusFilterValue: StatusValue = isStatusValue(requestedStatus) ? requestedStatus : "ALL";

  const normalizedTimeframe = (timeframeParam || "").toUpperCase();
  const explicitTimeframe =
    timeframeTabs.find((tab) => tab.value === normalizedTimeframe)?.value ?? null;
  const timeframeFilterValue =
    explicitTimeframe === "ALLTIME"
      ? null
      : explicitTimeframe !== null
      ? explicitTimeframe
      : statusFilterValue === "ALL"
      ? null
      : "LAST24";
  const activeTimeframeChip =
    explicitTimeframe ?? (statusFilterValue === "ALL" ? "ALLTIME" : "LAST24");

  const providerId = sess.pid;
  const now = new Date();

  const statusFilter: Prisma.AppointmentWhereInput =
    statusFilterValue === "ALL" ? {} : { status: statusFilterValue };

  let timeframeFilter: Prisma.AppointmentWhereInput = {};
  if (timeframeFilterValue === "LAST24") {
    timeframeFilter = { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
  } else if (timeframeFilterValue === "FUTURE") {
    timeframeFilter = {
      OR: [{ slot: { startsAt: { gte: now } } }, { slotId: null, createdAt: { gte: now } }],
    };
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId,
      ...statusFilter,
      ...timeframeFilter,
    },
    orderBy: { createdAt: "desc" },
    include: {
      patient: true,
      provider: true,
      slot: true,
    },
    take: 100,
  });

  const upcomingAppointment = appointments
    .filter((appt) => {
      const when = appt.slot?.startsAt || appt.createdAt;
      return when >= now;
    })
    .sort((a, b) => {
      const aWhen = a.slot?.startsAt || a.createdAt;
      const bWhen = b.slot?.startsAt || b.createdAt;
      return aWhen.getTime() - bWhen.getTime();
    })[0];

  const baseWindowFilter: Prisma.AppointmentWhereInput = {
    providerId,
    ...timeframeFilter,
  };

  const statusDistribution = await prisma.appointment.groupBy({
    by: ["status"],
    where: baseWindowFilter,
    _count: { _all: true },
  });

  const statusCountMap = new Map<string, number>();
  for (const row of statusDistribution) {
    statusCountMap.set(row.status, row._count._all);
  }

  const summaryConfig = [
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PENDING", label: "Pending" },
    { key: "CANCELLED", label: "Cancelled" },
    { key: "NO_SHOW", label: "No-show" },
    { key: "RESCHEDULED", label: "Rescheduled" },
  ] as const;

  const knownKeys = new Set<string>(summaryConfig.map((entry) => entry.key));
  const extras = statusDistribution
    .filter((row) => !knownKeys.has(row.status))
    .map((row) => ({
      key: row.status,
      label: row.status
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      value: row._count._all,
    }));

  const totalFiltered = statusDistribution.reduce((sum, row) => sum + row._count._all, 0);
  const summary = [
    { key: "ALL", label: "All appointments", value: totalFiltered },
    ...summaryConfig.map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: statusCountMap.get(entry.key) || 0,
    })),
    ...extras,
  ];

  const mkStatusHref = (value?: string) => {
    const params = new URLSearchParams();
    if (value && value !== "ALL") params.set("status", value);
    if (explicitTimeframe) {
      params.set("timeframe", explicitTimeframe);
    }
    const qs = params.toString();
    return qs ? `/provider/appointments?${qs}` : "/provider/appointments";
  };

  const mkTimeframeHref = (value: string) => {
    const params = new URLSearchParams();
    if (statusFilterValue && statusFilterValue !== "ALL") params.set("status", statusFilterValue);
    if (value !== "ALLTIME") {
      params.set("timeframe", value);
    } else {
      params.delete("timeframe");
    }
    const qs = params.toString();
    return qs ? `/provider/appointments?${qs}` : "/provider/appointments";
  };

  const refreshParams = new URLSearchParams();
  if (statusFilterValue && statusFilterValue !== "ALL") refreshParams.set("status", statusFilterValue);
  if (explicitTimeframe) refreshParams.set("timeframe", explicitTimeframe);
  refreshParams.set("ts", now.getTime().toString());
  const refreshQuery = refreshParams.toString();
  const refreshHref = refreshQuery ? `/provider/appointments?${refreshQuery}` : "/provider/appointments";

  const providerRoomLink = (url: string) => (url.includes("?") ? `${url}&from=provider` : `${url}?from=provider`);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-gradient-to-br from-[#eff4ff] via-white to-white p-6 shadow-sm ring-1 ring-slate-100 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Doctor workspace</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Hello, {provider?.name || "Doctor"}</h1>
            <p className="text-sm text-slate-500">
              Manage today&apos;s teleconsultations, confirm bookings, and share prescriptions from one place.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/provider/schedule"
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Manage slots
            </Link>
            <form action="/provider/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {upcomingAppointment && (
          <div className="mt-6 rounded-3xl border border-blue-100 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Next consult</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <span className="text-base font-semibold text-slate-900">
                {upcomingAppointment.patientName || upcomingAppointment.patient?.name || "Patient"} ·{" "}
                {upcomingAppointment.provider?.speciality || "Teleconsultation"}
              </span>
              <span>{formatSlot(upcomingAppointment.slot?.startsAt || upcomingAppointment.createdAt)}</span>
              <Link
                href={`/provider/appointments/${upcomingAppointment.id}`}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:border-blue-400 hover:text-blue-900"
              >
                Open details
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {summary.map((item) => {
            const isActive = statusFilterValue === item.key || (item.key === "ALL" && statusFilterValue === "ALL");
            return (
              <Link
                key={item.key}
                href={mkStatusHref(item.key)}
                className={`rounded-2xl border p-4 text-center shadow-sm transition ${
                  isActive
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-100 bg-white hover:border-blue-200"
                }`}
              >
                <p className={`text-xs uppercase tracking-wide ${isActive ? "text-blue-700" : "text-slate-500"}`}>
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {provider && provider.slug && (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile photo</p>
              <h2 className="text-xl font-semibold text-slate-900">{provider.name}</h2>
              <p className="text-sm text-slate-500">
                Upload a portrait so patients recognise you on the booking page.
              </p>
            </div>
            <ProviderPhotoForm slug={provider.slug} initialKey={provider.profilePhotoKey} />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {timeframeTabs.map((tab) => (
              <Link
                key={tab.value}
                href={mkTimeframeHref(tab.value)}
                className={`rounded-full px-3 py-1 ${
                  activeTimeframeChip === tab.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </Link>
            ))}
            <Link
              href={refreshHref}
              className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              Refresh
            </Link>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No appointments match the selected filters.
                  </td>
                </tr>
              )}
              {appointments.map((appt) => (
                <tr key={appt.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {appt.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{appt.provider?.speciality || "Teleconsult"}</div>
                    <div className="font-mono text-xs text-slate-500">{appt.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {appt.patientName || appt.patient?.name || "—"}
                    </div>
                    <div className="text-xs text-slate-500">{appt.patient?.phone || "No phone"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        appt.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700"
                          : appt.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{appt.waStatus || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {appt.status === "CONFIRMED" ? (
                        appt.videoRoom ? (
                          <a
                            href={providerRoomLink(appt.videoRoom)}
                            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Join visit
                          </a>
                        ) : (
                          <Link
                            href={`/visit/${appt.id}?from=provider`}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Visit room
                          </Link>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting confirmation</span>
                      )}
                      <Link
                        href={`/provider/appointments/${appt.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      >
                        Open details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">Showing up to 100 recent appointments.</p>
      </section>
    </div>
  );
}
