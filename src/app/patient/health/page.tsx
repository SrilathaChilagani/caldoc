import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import PatientPortalNav from "@/components/PatientPortalNav";
import PatientMobileTabs from "@/components/PatientMobileTabs";
import PatientAvatarUpload from "@/components/PatientAvatarUpload";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ phone?: string }>;
};

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
  return { last10, candidates: Array.from(set) };
}

function formatIST(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeTests(tests: unknown): string {
  if (!Array.isArray(tests)) return "";
  return tests
    .map((t) => String((t as { name?: string })?.name || t || "").trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeItems(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((i) => String((i as { name?: string })?.name || i || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

const apptStatusLabels: Record<string, string> = {
  CONFIRMED:   "Confirmed",
  PENDING:     "Pending",
  COMPLETED:   "Completed",
  CANCELED:    "Cancelled",
  CANCELLED:   "Cancelled",
  NO_SHOW:     "No show",
  IN_PROGRESS: "In progress",
};

const apptStatusColor: Record<string, string> = {
  COMPLETED:   "bg-emerald-50 text-emerald-700",
  CONFIRMED:   "bg-blue-50 text-blue-700",
  PENDING:     "bg-amber-50 text-amber-700",
  CANCELED:    "bg-rose-50 text-rose-700",
  CANCELLED:   "bg-rose-50 text-rose-700",
  NO_SHOW:     "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700",
};

const labStatusInfo: Record<string, { label: string; color: string }> = {
  PENDING:          { label: "Pending",          color: "text-amber-600" },
  AWAITING_PAYMENT: { label: "Awaiting payment", color: "text-amber-600" },
  CONFIRMED:        { label: "Confirmed",         color: "text-blue-600" },
  SAMPLE_COLLECTED: { label: "Sample collected",  color: "text-blue-600" },
  PROCESSING:       { label: "Processing",        color: "text-indigo-600" },
  REPORTS_READY:    { label: "Results ready",     color: "text-emerald-700 font-semibold" },
  COMPLETED:        { label: "Completed",         color: "text-emerald-700" },
  CANCELLED:        { label: "Cancelled",         color: "text-slate-400" },
};

const rxStatusLabels: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_CAPTURED: "Paid",
  CONFIRMED:        "Confirmed",
  DISPATCHED:       "Dispatched",
  DELIVERED:        "Delivered",
  CANCELLED:        "Cancelled",
};

export default async function PatientHealthPage(props: PageProps) {
  const sp = (await props.searchParams) || {};
  const cookiePhone = (await readPatientPhone()) || "";
  const urlPhone = sp.phone || "";
  const phoneSource = urlPhone || cookiePhone;
  const { last10, candidates } = buildPhoneCandidates(phoneSource);

  if (!last10) {
    redirect("/patient/login?next=/patient/health");
  }

  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ phone: { contains: last10 } }, { phone: { in: candidates } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, profilePhotoKey: true },
  });

  if (!patient) {
    redirect("/patient/login?next=/patient/health");
  }

  const photoToken = patient.profilePhotoKey ? encodeURIComponent(patient.profilePhotoKey) : null;
  const photoSrc = photoToken ? `/api/patient/profile/photo?v=${photoToken}` : null;
  const nameIsPhone = !patient.name || /^[+\d\s().\-]{6,}$/.test(patient.name.trim());
  const displayName = nameIsPhone ? null : patient.name;
  const avatarInitial = (patient.name || "").replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase() || "P";

  const [appointments, rxOrders] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        provider: { select: { id: true, name: true, speciality: true, slug: true } },
        slot: { select: { startsAt: true } },
        prescription: { select: { id: true } },
        labOrders: {
          select: { id: true, tests: true, status: true, resultsPdfKey: true },
          orderBy: { createdAt: "asc" },
        },
        payment: { select: { status: true } },
      },
    }),
    prisma.rxOrder.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, items: true, status: true, amountPaise: true, createdAt: true },
    }),
  ]);

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-start gap-5">
          <PatientAvatarUpload photoSrc={photoSrc} initial={avatarInitial} />
          <div className="pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Patient portal</p>
            {displayName ? (
              <>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{displayName}</h1>
                <p className="text-sm font-mono text-slate-500">{patient.phone}</p>
              </>
            ) : (
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{patient.phone}</h1>
            )}
          </div>
        </div>

        <PatientPortalNav active="health" phone={urlPhone || patient.phone} />

        <div>
          <h2 className="font-serif text-2xl text-slate-900">Health record</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your complete care history — consultations, tests, and prescriptions in one place.
          </p>
        </div>

        {appointments.length === 0 && rxOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-slate-500">No care history yet.</p>
            <Link href="/providers" className="mt-3 inline-block text-sm font-semibold text-[#2f6ea5] hover:underline">
              Find a doctor →
            </Link>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

            {appointments.map((appt) => {
              const when = appt.slot?.startsAt ?? appt.createdAt;
              const statusColor = apptStatusColor[appt.status] ?? "bg-slate-100 text-slate-600";
              const statusLabel = apptStatusLabels[appt.status] ?? appt.status.replace(/_/g, " ");
              const isUpcoming = ["CONFIRMED", "PENDING"].includes(appt.status);
              const followUpNote = `Follow-up for consultation on ${formatIST(when)}`;
              const followUpPath = appt.provider
                ? `/book/${encodeURIComponent(appt.provider.slug || appt.provider.id)}?followUpNote=${encodeURIComponent(followUpNote)}`
                : null;

              return (
                <div key={appt.id} className="flex gap-5 pb-6">
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1.5 hidden shrink-0 sm:block">
                    <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                      appt.status === "COMPLETED" ? "bg-emerald-500" :
                      isUpcoming ? "bg-[#2f6ea5]" : "bg-slate-300"
                    }`} />
                  </div>

                  <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5">
                    {/* Row 1: title + status */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-400">{formatIST(when)}</p>
                        <p className="mt-0.5 font-semibold text-slate-900">
                          {appt.provider?.name || "Consultation"}
                        </p>
                        {appt.provider?.speciality && (
                          <p className="text-sm text-[#2f6ea5]">{appt.provider.speciality}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Lab orders */}
                    {appt.labOrders.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lab tests</p>
                        {appt.labOrders.map((order) => {
                          const testNames = normalizeTests(order.tests) || "Tests ordered";
                          const info = labStatusInfo[order.status] ?? { label: order.status, color: "text-slate-600" };
                          return (
                            <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                              <div className="min-w-0">
                                <span className="text-xs text-slate-700 truncate">{testNames}</span>
                                <span className={`ml-2 text-[11px] ${info.color}`}>· {info.label}</span>
                              </div>
                              {order.resultsPdfKey && (
                                <a
                                  href={`/api/patient/lab-orders/results/${order.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-xs font-semibold text-emerald-700 hover:underline"
                                >
                                  Download results
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action row */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isUpcoming && (
                        <Link
                          href={`/patient/appointments/${appt.id}`}
                          className="rounded-full bg-[#2f6ea5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#255b8b]"
                        >
                          View appointment
                        </Link>
                      )}
                      {appt.prescription && (
                        <a
                          href={`/api/appointments/${appt.id}/prescription.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                        >
                          Prescription
                        </a>
                      )}
                      {appt.prescription && (
                        <a
                          href="/services/rx-delivery"
                          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                        >
                          Order medicines
                        </a>
                      )}
                      {followUpPath && appt.status === "COMPLETED" && (
                        <Link
                          href={followUpPath}
                          className="rounded-full border border-[#2f6ea5]/30 px-4 py-1.5 text-xs font-medium text-[#2f6ea5] hover:border-[#2f6ea5]"
                        >
                          Book follow-up
                        </Link>
                      )}
                      {!isUpcoming && appt.status !== "COMPLETED" && (
                        <Link
                          href={`/patient/appointments/${appt.id}`}
                          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                        >
                          View details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Standalone Rx orders */}
            {rxOrders.length > 0 && (
              <>
                <div className="pb-3 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Medicine deliveries</p>
                </div>
                {rxOrders.map((rx) => {
                  const items = normalizeItems(rx.items);
                  const statusLabel = rxStatusLabels[rx.status] ?? rx.status.replace(/_/g, " ");
                  const amountINR = rx.amountPaise ? `₹${(rx.amountPaise / 100).toFixed(0)}` : null;
                  return (
                    <div key={rx.id} className="flex gap-5 pb-4">
                      <div className="relative z-10 mt-1.5 hidden shrink-0 sm:block">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-300 ring-2 ring-white" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-400">{formatIST(rx.createdAt)}</p>
                        <p className="mt-0.5 font-semibold text-slate-900">Medicine delivery</p>
                        {items && <p className="mt-0.5 text-sm text-slate-500 truncate">{items}</p>}
                        <div className="mt-1.5 flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-600">{statusLabel}</span>
                          {amountINR && <span className="text-xs text-slate-400">· {amountINR}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Quick links</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/patient/labs" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              All lab orders →
            </Link>
            <Link href="/patient/pharmacy" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              All medicine deliveries →
            </Link>
            <Link href="/providers" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              Find a doctor →
            </Link>
          </div>
        </div>
      </div>

      <PatientMobileTabs />
    </div>
  );
}
