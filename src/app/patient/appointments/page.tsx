// src/app/patient/appointments/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PATIENT_COOKIE } from "@/lib/patientAuth.server";
import { cookies } from "next/headers";
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

  const jar = await cookies();
  const cookiePhone = jar.get(PATIENT_COOKIE)?.value || "";
  const urlPhone = sp.phone || "";
  const phoneSource = urlPhone || cookiePhone;
  const { last10, candidates } = buildPhoneCandidates(phoneSource);

  if (!last10) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-12">
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
      <main className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-12">
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

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-10">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="pb-6 border-b border-slate-200 md:pb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#2f6ea5] text-2xl font-semibold text-white">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">Patient portal</p>
                <h1 className="font-serif text-3xl font-semibold text-slate-900">{patient.name || "Patient"}</h1>
                <p className="text-sm font-mono text-slate-500">{patient.phone}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <PatientBookingModal
                label="Book appointment"
                path="/providers"
                patientName={patient.name}
                patientPhone={patient.phone}
                className="inline-flex items-center justify-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#255b8b]"
              />
              <Link
                href="/patient/profile"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Profile
              </Link>
              <a
                href="/api/patient/logout"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Sign out
              </a>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Review upcoming visits, download receipts, and share documents with your doctor before the call.
          </p>
          <PatientPortalNav active="appointments" phone={urlPhone || patient.phone} />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {summary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {err === "notfound" && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We couldn&apos;t find that appointment. Please pick another from the list below.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {allowedFilters.map((filter) => (
            <Link
              key={filter}
              href={mkFilterHref(filter)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                activeFilter === filter
                  ? "bg-[#2f6ea5] text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
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

        <div className="space-y-4">
          {appointments.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              {activeFilter === "ALL"
                ? "No appointments found."
                : "No appointments found for this filter."}
            </div>
          )}

          {appointments.map((appt) => {
            const when = appt.slot?.startsAt ?? appt.createdAt;
            const visitUrl =
              appt.videoRoom && appt.videoRoom.startsWith("http")
                ? appt.videoRoom
                : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/visit/${appt.id}`;

            return (
              <div
                key={appt.id}
                className="border-b border-slate-100 py-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {appt.provider?.name || "Doctor pending"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appt.provider?.speciality || "Teleconsultation"} · {formatIST(when)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Patient: {appt.patientName || patient.name || "Patient"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      statusClasses[appt.status] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {appt.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {visitUrl && (appt.status === "CONFIRMED" || appt.status === "PENDING") && (
                    <a
                      href={visitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
                    >
                      Join visit
                    </a>
                  )}
                  {appt.provider && (
                    <PatientBookingModal
                      label="Book follow-up"
                      path={`/book/${encodeURIComponent(appt.provider.slug || appt.provider.id)}?ref=patient-portal`}
                      patientName={appt.patientName || patient.name}
                      patientPhone={patient.phone}
                      className="rounded-full border border-[#2f6ea5]/30 px-4 py-2 text-sm font-medium text-[#2f6ea5] hover:border-[#2f6ea5] hover:text-[#255b8b]"
                    />
                  )}
                  {appt.prescription && (
                    <a
                      href={`/api/appointments/${appt.id}/prescription.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                    >
                      Prescription
                    </a>
                  )}
                  {appt.payment?.receiptUrl && (
                    <a
                      href={appt.payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                    >
                      Receipt
                    </a>
                  )}
                  <Link
                    href={`/patient/appointments/${appt.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                  >
                    View details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500">Showing up to 100 of your most recent appointments.</p>
      </div>

      <PatientMobileTabs />
    </div>
  );
}
