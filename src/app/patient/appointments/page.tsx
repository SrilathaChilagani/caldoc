// src/app/patient/appointments/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { readPatientPhone } from "@/lib/patientAuth.server";
import Link from "next/link";
import PatientMobileTabs from "@/components/PatientMobileTabs";
import PatientBookingModal from "@/components/PatientBookingModal";
import PatientPortalNav from "@/components/PatientPortalNav";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ filter?: string; phone?: string; err?: string }>;
};

type FilterKey = "ALL" | "CONFIRMED" | "PENDING" | "CANCELED" | "NO_SHOW" | "UPCOMING";

const allowedFilters: FilterKey[] = [
  "ALL",
  "CONFIRMED",
  "PENDING",
  "CANCELED",
  "NO_SHOW",
  "UPCOMING",
];

function buildPhoneCandidates(raw: string | undefined | null) {
  const trimmed = (raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  const last10 = digits.slice(-10);

  const set = new Set<string>();
  if (trimmed) set.add(trimmed);
  if (digits) set.add(digits);
  if (last10) {
    set.add(last10);
    set.add("+91" + last10);
    set.add("91" + last10);
    set.add("0" + last10);
  }

  return { digits, last10, candidates: Array.from(set) };
}

function formatIST(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PatientAppointments(props: PageProps) {
  const sp = (await props.searchParams) || {};
  const filterRaw = (sp.filter || "").toUpperCase();
  const err = sp.err;

  // Cookie holds a signed JWT — decode it to the phone. Reading the raw
  // cookie value here would feed the JWT string into buildPhoneCandidates
  // and never match a patient.
  const cookiePhone = (await readPatientPhone()) || "";
  const urlPhone = sp.phone || "";
  const phoneSource = urlPhone || cookiePhone;
  const { last10, candidates } = buildPhoneCandidates(phoneSource);

  if (!last10) {
    return (
      <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-slate-700">
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Patient portal</h1>
          <p>
            To view your appointments, please {" "}
            <Link href="/patient/login" className="text-[#2f6ea5]">sign in</Link>{" "}with your mobile number.
          </p>
        </div>
        <PatientMobileTabs />
      </main>
    );
  }

  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ phone: { contains: last10 } }, { phone: { in: candidates } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      profilePhotoKey: true,
    },
  });

  if (!patient) {
    return (
      <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-slate-700">
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Patient portal</h1>
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We couldn&apos;t find a patient with that phone number.
          </p>
          <p>
            Make sure you use the same number you booked with or {" "}
            <Link href="/patient/login" className="text-[#2f6ea5]">try again</Link>.
          </p>
        </div>
        <PatientMobileTabs />
      </main>
    );
  }

  const photoToken = patient.profilePhotoKey ? encodeURIComponent(patient.profilePhotoKey) : null;
  const photoSrc = photoToken ? `/api/patient/profile/photo?v=${photoToken}` : null;

  const activeFilter: FilterKey = allowedFilters.includes(filterRaw as FilterKey)
    ? (filterRaw as FilterKey)
    : "ALL";

  const whereBase: Prisma.AppointmentWhereInput = { patientId: patient.id };
  let statusFilter: Prisma.AppointmentWhereInput = {};
  if (activeFilter === "CONFIRMED") statusFilter = { status: "CONFIRMED" };
  else if (activeFilter === "PENDING") statusFilter = { status: "PENDING" };
  else if (activeFilter === "CANCELED") statusFilter = { status: "CANCELED" };
  else if (activeFilter === "NO_SHOW") statusFilter = { status: "NO_SHOW" };
  else if (activeFilter === "UPCOMING") statusFilter = { status: { in: ["CONFIRMED", "PENDING"] } };

  const appointments = await prisma.appointment.findMany({
    where: { ...whereBase, ...statusFilter },
    orderBy: { createdAt: "desc" },
    include: {
      provider: true,
      prescription: true,
      payment: true,
      slot: true,
    },
    take: 100,
  });

  const mkFilterHref = (f?: FilterKey) => {
    const qp = new URLSearchParams();
    if (f && f !== "ALL") qp.set("filter", f);
    if (urlPhone) qp.set("phone", urlPhone);
    const qs = qp.toString();
    return qs ? `/patient/appointments?${qs}` : "/patient/appointments";
  };

  const statusClasses: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    CANCELED: "bg-rose-50 text-rose-700",
    NO_SHOW: "bg-slate-100 text-slate-700",
  };

  const summary = [
    { label: "All appointments", value: appointments.length },
    { label: "Confirmed", value: appointments.filter((a) => a.status === "CONFIRMED").length },
    { label: "Pending", value: appointments.filter((a) => a.status === "PENDING").length },
  ];

  const tabs = [
    {
      key: "appointments",
      label: "Appointments",
      href: urlPhone ? `/patient/appointments?phone=${urlPhone}` : "/patient/appointments",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 11h18" />
        </svg>
      ),
    },
    {
      key: "documents",
      label: "Documents",
      href: urlPhone ? `/patient/labs?phone=${urlPhone}` : "/patient/labs",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
          <path d="M14 2v5h5" />
        </svg>
      ),
    },
    {
      key: "profile",
      label: "Profile",
      href: "/patient/profile",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2f6ea5] text-2xl font-semibold text-white shadow-sm">
              {photoSrc ? (
                <Image
                  src={photoSrc}
                  alt="Profile"
                  width={56}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                (patient.name || "P").charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Patient portal</p>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{patient.name || "Patient"}</h1>
              <p className="text-sm font-mono text-slate-500">{patient.phone}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PatientBookingModal
              label="Book appointment"
              path="/providers"
              patientName={patient.name}
              patientPhone={patient.phone}
              className="inline-flex items-center justify-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#255b8b]"
            />
            <a
              href="/api/patient/logout"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Sign out
            </a>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="rounded-2xl border border-white/70 bg-white/90 p-3 ">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const isActive = tab.key === "appointments";
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#2f6ea5]/10 text-[#2f6ea5]"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* KPI summary cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {summary.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/70 bg-white/90 p-4 text-center ">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        {err === "notfound" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We couldn&apos;t find that appointment. Please pick another from the list below.
          </div>
        )}

        {/* Appointments card */}
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 ">
          {/* Filter pills */}
          <div className="mb-6 flex flex-wrap gap-2">
            {allowedFilters.map((filter) => (
              <Link
                key={filter}
                href={mkFilterHref(filter)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? "bg-[#2f6ea5] text-white shadow-sm"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-[#2f6ea5]/40 hover:text-[#2f6ea5]"
                }`}
              >
                {filter === "ALL"
                  ? "All"
                  : filter === "NO_SHOW"
                  ? "No show"
                  : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>

          {/* Appointment rows */}
          <div className="divide-y divide-slate-100">
            {appointments.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                {activeFilter === "ALL" ? "No appointments found." : "No appointments found for this filter."}
              </div>
            )}

            {appointments.map((appt) => {
              const when = appt.slot?.startsAt ?? appt.createdAt;
              const visitUrl =
                appt.videoRoom && appt.videoRoom.startsWith("http")
                  ? appt.videoRoom
                  : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/visit/${appt.id}`;

              return (
                <div key={appt.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {appt.provider?.name || "Doctor pending"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appt.provider?.speciality || "Teleconsultation"} · {formatIST(when)}
                      </p>
                      {appt.patientName && appt.patientName !== patient.name && (
                        <p className="text-xs text-slate-400">For: {appt.patientName}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-semibold md:self-auto ${
                        statusClasses[appt.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {appt.status === "CANCELED" ? "CANCELLED" : appt.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {visitUrl && (appt.status === "CONFIRMED" || appt.status === "PENDING") && (
                      <a
                        href={visitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#2f6ea5] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="7" width="13" height="10" rx="2" /><path d="M16 10l5-3v10l-5-3" />
                        </svg>
                        Join visit
                      </a>
                    )}
                    {appt.provider && (
                      <PatientBookingModal
                        label="Book follow-up"
                        path={`/book/${encodeURIComponent(appt.provider.slug || appt.provider.id)}?ref=patient-portal`}
                        patientName={appt.patientName || patient.name}
                        patientPhone={patient.phone}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#2f6ea5]/30 px-4 py-1.5 text-sm font-medium text-[#2f6ea5] hover:border-[#2f6ea5]"
                      />
                    )}
                    {appt.prescription && (
                      <a
                        href={`/api/appointments/${appt.id}/prescription.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>
                        Prescription
                      </a>
                    )}
                    {appt.payment?.receiptUrl && (
                      <a
                        href={appt.payment.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                        Receipt
                      </a>
                    )}
                    <Link
                      href={`/patient/appointments/${appt.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                    >
                      View details
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-5 text-xs text-slate-400">Showing up to 100 of your most recent appointments.</p>
        </div>
      </div>

      <PatientMobileTabs />
    </div>
  );
}
