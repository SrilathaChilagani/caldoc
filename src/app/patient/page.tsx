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

function normalizeTests(tests: unknown): string {
  if (!Array.isArray(tests)) return "Tests ordered";
  return (
    tests
      .map((t) => String((t as { name?: string })?.name || t || "").trim())
      .filter(Boolean)
      .join(", ") || "Tests ordered"
  );
}

type TimeInfo = {
  dayLabel: string;
  timeStr: string;
  isToday: boolean;
  isTomorrow: boolean;
  isImminent: boolean;
};

function appointmentTimeInfo(date: Date | string | null | undefined): TimeInfo {
  if (!date) return { dayLabel: "—", timeStr: "", isToday: false, isTomorrow: false, isImminent: false };
  const d = new Date(date);
  const nowMs = Date.now();
  const diffMin = (d.getTime() - nowMs) / 60000;

  const istOpts = { timeZone: "Asia/Kolkata" } as const;
  const toIST = (dt: Date) =>
    new Date(dt.toLocaleString("en-US", istOpts));

  const apptIST = toIST(d);
  const todayIST = toIST(new Date());
  const tomorrowIST = new Date(todayIST);
  tomorrowIST.setDate(tomorrowIST.getDate() + 1);

  const isToday = apptIST.toDateString() === todayIST.toDateString();
  const isTomorrow = apptIST.toDateString() === tomorrowIST.toDateString();
  const isImminent = diffMin > -15 && diffMin < 60;

  const timeStr = apptIST.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : apptIST.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      });

  return { dayLabel, timeStr, isToday, isTomorrow, isImminent };
}

function shortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// ── Card sub-components ──────────────────────────────────────────────────────

function CardShell({
  accent,
  icon,
  category,
  children,
}: {
  accent: string;
  icon: React.ReactNode;
  category: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex gap-4 rounded-3xl bg-white p-5 shadow-sm border-l-4 ${accent}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {category}
        </p>
        {children}
      </div>
    </div>
  );
}

function CtaRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>;
}

function PrimaryBtn({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
      >
        {label}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
    >
      {label}
    </Link>
  );
}

function GhostBtn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-[#2f6ea5]/30 px-5 py-2 text-sm font-medium text-[#2f6ea5] hover:border-[#2f6ea5]"
    >
      {label}
    </Link>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

const CalIcon = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7edf3]">
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#2f6ea5]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  </div>
);

const RxIcon = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 3h6a4 4 0 0 1 0 8H9a4 4 0 0 1 0-8z" /><path d="M8 21h8a4 4 0 0 0 0-8H8a4 4 0 0 0 0 8z" />
    </svg>
  </div>
);

const FlaskIcon = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 3h6v8l4 9H5l4-9z" />
    </svg>
  </div>
);

const ResultsIcon = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 12l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  </div>
);

const FollowUpIcon = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  </div>
);

const ProgressIcon = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" />
    </svg>
  </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PatientDashboard(props: PageProps) {
  const sp = (await props.searchParams) || {};
  const cookiePhone = (await readPatientPhone()) || "";
  const urlPhone = sp.phone || "";
  const phoneSource = urlPhone || cookiePhone;
  const { last10, candidates } = buildPhoneCandidates(phoneSource);

  if (!last10) {
    redirect("/patient/login?next=/patient");
  }

  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ phone: { contains: last10 } }, { phone: { in: candidates } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, profilePhotoKey: true },
  });

  if (!patient) {
    redirect("/patient/login?next=/patient");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 86400 * 1000);

  // All queries in parallel
  const [nextAppt, allUpcomingAppts, labOrders, unfilledRx, recentCompleted] =
    await Promise.all([
      // 1. Very next upcoming appointment
      prisma.appointment.findFirst({
        where: {
          patientId: patient.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          slot: { startsAt: { gte: now } },
        },
        orderBy: { slot: { startsAt: "asc" } },
        select: {
          id: true,
          videoRoom: true,
          visitMode: true,
          provider: { select: { id: true, name: true, speciality: true, slug: true } },
          slot: { select: { startsAt: true } },
        },
      }),

      // 2. All upcoming appts (for provider deduplication in follow-up)
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          slot: { startsAt: { gte: now, lte: sevenDaysAhead } },
        },
        select: { providerId: true },
      }),

      // 3. Lab orders needing action
      prisma.labOrder.findMany({
        where: {
          patientId: patient.id,
          status: {
            in: [
              "AWAITING_PAYMENT",
              "CONFIRMED",
              "SAMPLE_COLLECTED",
              "PROCESSING",
              "REPORTS_READY",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          tests: true,
          status: true,
          resultsPdfKey: true,
          createdAt: true,
          updatedAt: true,
          appointment: {
            select: {
              id: true,
              provider: { select: { name: true, slug: true, id: true } },
            },
          },
        },
      }),

      // 4. Completed appointments with prescription but no linked Rx order
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          status: "COMPLETED",
          prescription: { isNot: null },
          rxOrders: { none: {} },
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          provider: { select: { name: true, slug: true } },
          slot: { select: { startsAt: true } },
        },
      }),

      // 5. Recently completed appointments (for follow-up suggestion)
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          status: "COMPLETED",
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          provider: { select: { id: true, name: true, slug: true, speciality: true } },
          slot: { select: { startsAt: true } },
        },
      }),
    ]);

  // Providers the patient already has an upcoming booking with
  const upcomingProviderIds = new Set(allUpcomingAppts.map((a) => a.providerId));

  // Follow-up candidates: completed appointments where no upcoming booking exists for same doctor
  const followUpCandidates = recentCompleted.filter(
    (a) => a.provider && !upcomingProviderIds.has(a.providerId),
  );

  // Separate lab orders by status tier
  const labPendingPayment = labOrders.filter((o) => o.status === "AWAITING_PAYMENT");
  const labResultsReady = labOrders.filter((o) => o.status === "REPORTS_READY");
  const labInProgress = labOrders.filter((o) =>
    ["CONFIRMED", "SAMPLE_COLLECTED", "PROCESSING"].includes(o.status),
  );

  const labStatusLabel: Record<string, string> = {
    CONFIRMED: "Sample collection scheduled",
    SAMPLE_COLLECTED: "Sample collected",
    PROCESSING: "Processing results",
  };

  // Total action count for the header
  const actionCount =
    (nextAppt ? 1 : 0) +
    labPendingPayment.length +
    labResultsReady.length +
    unfilledRx.length +
    (followUpCandidates.length > 0 ? 1 : 0);

  const photoToken = patient.profilePhotoKey
    ? encodeURIComponent(patient.profilePhotoKey)
    : null;
  const photoSrc = photoToken ? `/api/patient/profile/photo?v=${photoToken}` : null;
  const nameIsPhone = !patient.name || /^[+\d\s().\-]{6,}$/.test(patient.name.trim());
  const displayName = nameIsPhone ? null : patient.name;
  const avatarInitial =
    (patient.name || "").replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase() || "P";

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-16">
      <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-start gap-5">
          <PatientAvatarUpload photoSrc={photoSrc} initial={avatarInitial} />
          <div className="pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">
              Patient portal
            </p>
            {displayName ? (
              <>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                  {displayName}
                </h1>
                <p className="text-sm font-mono text-slate-500">{patient.phone}</p>
              </>
            ) : (
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                {patient.phone}
              </h1>
            )}
          </div>
        </div>

        <PatientPortalNav active="dashboard" phone={urlPhone || patient.phone} />

        {/* Dashboard header */}
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-serif text-2xl text-slate-900">Your care queue</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {actionCount === 0
                ? "Nothing needs your attention right now."
                : `${actionCount} action${actionCount === 1 ? "" : "s"} need${actionCount === 1 ? "s" : ""} your attention`}
            </p>
          </div>
          {actionCount > 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f6ea5] text-xs font-bold text-white">
              {actionCount}
            </span>
          )}
        </div>

        {/* ── Empty state ── */}
        {actionCount === 0 && labInProgress.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-900">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-slate-500">No pending actions at the moment.</p>
            <Link
              href="/providers"
              className="mt-5 inline-flex items-center rounded-full bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
            >
              Find a doctor →
            </Link>
          </div>
        )}

        {/* ── 1. Next Appointment ── */}
        {nextAppt && (() => {
          const slotDate = nextAppt.slot?.startsAt;
          const { dayLabel, timeStr, isImminent } = appointmentTimeInfo(slotDate);
          const visitUrl =
            nextAppt.videoRoom && nextAppt.videoRoom.startsWith("http")
              ? nextAppt.videoRoom
              : `/patient/appointments/${nextAppt.id}`;
          return (
            <CardShell
              accent={isImminent ? "border-l-emerald-500" : "border-l-[#2f6ea5]"}
              icon={<CalIcon />}
              category="Next appointment"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {nextAppt.provider?.name ?? "Doctor pending"}
                  </p>
                  {nextAppt.provider?.speciality && (
                    <p className="text-sm text-[#2f6ea5]">{nextAppt.provider.speciality}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500">
                    {dayLabel}
                    {timeStr ? ` · ${timeStr}` : ""}
                  </p>
                </div>
                {isImminent && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Starting soon
                  </span>
                )}
              </div>
              <CtaRow>
                <PrimaryBtn
                  href={visitUrl}
                  label={isImminent ? "Join consultation →" : "View appointment →"}
                  external={visitUrl.startsWith("http")}
                />
              </CtaRow>
            </CardShell>
          );
        })()}

        {/* ── 2. Lab Tests Pending Payment ── */}
        {labPendingPayment.map((order) => {
          const tests = normalizeTests(order.tests);
          const doctorName = order.appointment?.provider?.name;
          return (
            <CardShell
              key={order.id}
              accent="border-l-amber-400"
              icon={<FlaskIcon />}
              category="Lab test · Payment pending"
            >
              <p className="text-base font-semibold text-slate-900">{tests}</p>
              {doctorName && (
                <p className="text-sm text-slate-500">Ordered by {doctorName}</p>
              )}
              <p className="text-sm text-slate-400">{shortDate(order.createdAt)}</p>
              <CtaRow>
                <PrimaryBtn href="/patient/labs" label="Pay & schedule →" />
              </CtaRow>
            </CardShell>
          );
        })}

        {/* ── 3. Prescriptions to fill ── */}
        {unfilledRx.map((appt) => {
          const slotDate = appt.slot?.startsAt ?? appt.createdAt;
          const providerSlug = appt.provider?.slug;
          return (
            <CardShell
              key={appt.id}
              accent="border-l-violet-500"
              icon={<RxIcon />}
              category="Prescription · Ready to order"
            >
              <p className="text-base font-semibold text-slate-900">
                {appt.provider?.name ?? "Doctor"} prescribed medicines
              </p>
              <p className="text-sm text-slate-500">
                Consultation on {shortDate(slotDate)}
              </p>
              <CtaRow>
                <PrimaryBtn
                  href={`/services/rx-delivery?appointmentId=${appt.id}`}
                  label="Get medicines delivered →"
                />
                <GhostBtn
                  href={`/api/appointments/${appt.id}/prescription.pdf`}
                  label="View prescription"
                />
              </CtaRow>
            </CardShell>
          );
        })}

        {/* ── 4. Lab Results Ready ── */}
        {labResultsReady.map((order) => {
          const tests = normalizeTests(order.tests);
          const doctorName = order.appointment?.provider?.name;
          const providerSlug =
            order.appointment?.provider?.slug || order.appointment?.provider?.id;
          const followUpPath = providerSlug
            ? `/book/${encodeURIComponent(providerSlug)}?followUpNote=${encodeURIComponent("Follow-up after lab results")}`
            : null;
          return (
            <CardShell
              key={order.id}
              accent="border-l-emerald-500"
              icon={<ResultsIcon />}
              category="Lab results · Ready"
            >
              <p className="text-base font-semibold text-slate-900">{tests}</p>
              {doctorName && (
                <p className="text-sm text-slate-500">Ordered by {doctorName}</p>
              )}
              <p className="text-sm text-slate-400">
                Results uploaded {shortDate(order.updatedAt)}
              </p>
              <CtaRow>
                <PrimaryBtn
                  href={`/api/patient/lab-orders/results/${order.id}`}
                  label="View results →"
                  external
                />
                {followUpPath && (
                  <GhostBtn href={followUpPath} label="Book follow-up" />
                )}
              </CtaRow>
            </CardShell>
          );
        })}

        {/* ── 5. Lab Tests In Progress ── */}
        {labInProgress.map((order) => {
          const tests = normalizeTests(order.tests);
          const statusText = labStatusLabel[order.status] ?? order.status.replace(/_/g, " ");
          return (
            <CardShell
              key={order.id}
              accent="border-l-sky-400"
              icon={<ProgressIcon />}
              category="Lab test · In progress"
            >
              <p className="text-base font-semibold text-slate-900">{tests}</p>
              <p className="text-sm text-slate-500">{statusText}</p>
              <CtaRow>
                <GhostBtn href="/patient/labs" label="Track status →" />
              </CtaRow>
            </CardShell>
          );
        })}

        {/* ── 6. Follow-Up Suggestions (show top 2) ── */}
        {followUpCandidates.slice(0, 2).map((appt) => {
          const slotDate = appt.slot?.startsAt ?? appt.createdAt;
          const providerSlug = appt.provider?.slug || appt.provider?.id;
          if (!providerSlug) return null;
          const followUpPath = `/book/${encodeURIComponent(providerSlug)}?followUpNote=${encodeURIComponent(
            `Follow-up for consultation on ${shortDate(slotDate)}`,
          )}`;
          return (
            <CardShell
              key={appt.id}
              accent="border-l-indigo-400"
              icon={<FollowUpIcon />}
              category="Follow-up · Suggested"
            >
              <p className="text-base font-semibold text-slate-900">
                {appt.provider?.name ?? "Doctor"}
              </p>
              {appt.provider?.speciality && (
                <p className="text-sm text-[#2f6ea5]">{appt.provider.speciality}</p>
              )}
              <p className="text-sm text-slate-500">
                Consultation on {shortDate(slotDate)}
              </p>
              <CtaRow>
                <PrimaryBtn href={followUpPath} label="Book follow-up →" />
              </CtaRow>
            </CardShell>
          );
        })}

        {/* ── Footer quick links ── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quick links
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/providers" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              Find a doctor →
            </Link>
            <Link
              href={`/patient/appointments${urlPhone ? `?phone=${encodeURIComponent(urlPhone || patient.phone)}` : ""}`}
              className="text-sm font-medium text-[#2f6ea5] hover:underline"
            >
              All appointments →
            </Link>
            <Link href="/patient/labs" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              Lab orders →
            </Link>
            <Link href="/patient/pharmacy" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              Pharmacy →
            </Link>
            <Link href="/patient/health" className="text-sm font-medium text-[#2f6ea5] hover:underline">
              Health record →
            </Link>
          </div>
        </div>

      </div>
      <PatientMobileTabs />
    </div>
  );
}
