import Link from "next/link";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { formatINR } from "@/lib/format";
import PatientMobileTabs from "@/components/PatientMobileTabs";
import PatientBookingModal from "@/components/PatientBookingModal";
import PatientPortalNav from "@/components/PatientPortalNav";
import PatientAvatarUpload from "@/components/PatientAvatarUpload";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ phone?: string; err?: string }>;
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

function normalizeTests(tests: unknown): Array<{ name: string; qty: number }> {
  if (!Array.isArray(tests)) return [];
  return tests
    .map((test) => ({
      name: String((test as { name?: string })?.name || test || "").trim(),
      qty: Math.max(1, Number((test as { qty?: number })?.qty) || 1),
    }))
    .filter((test) => test.name);
}

export default async function PatientLabsPage(props: PageProps) {
  const sp = (await props.searchParams) || {};
  // Cookie holds a signed JWT — decode it to the phone (not the raw value).
  const cookiePhone = (await readPatientPhone()) || "";
  const urlPhone = sp.phone || "";
  const phoneSource = urlPhone || cookiePhone;
  const { last10, candidates } = buildPhoneCandidates(phoneSource);

  if (!last10) {
    return (
      <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-slate-700">
          <h1 className="font-serif text-3xl text-slate-900">Patient portal</h1>
          <p>
            To view your lab orders, please{" "}
            <Link href="/patient/login" className="text-[#2f6ea5]">sign in</Link>{" "}
            with your mobile number.
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
          <h1 className="font-serif text-3xl text-slate-900">Patient portal</h1>
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We couldn&apos;t find a patient with that phone number.
          </p>
          <p>
            Make sure you use the same number you booked with or{" "}
            <Link href="/patient/login" className="text-[#2f6ea5]">try again</Link>.
          </p>
        </div>
        <PatientMobileTabs />
      </main>
    );
  }

  const photoToken = patient.profilePhotoKey ? encodeURIComponent(patient.profilePhotoKey) : null;
  const photoSrc = photoToken ? `/api/patient/profile/photo?v=${photoToken}` : null;
  const nameIsPhone = !patient.name || /^[+\d\s().\-]{6,}$/.test(patient.name.trim());
  const displayName = nameIsPhone ? null : patient.name;
  const avatarInitial =
    (patient.name || "").replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase() || "P";

  const labOrders = await prisma.labOrder.findMany({
    where: {
      OR: [
        { patientId: patient.id },
        { patientPhone: { in: candidates } },
        { patientPhone: { contains: last10 } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      tests: true,
      amountPaise: true,
      createdAt: true,
      notes: true,
      resultsPdfKey: true,
      payment: { select: { receiptUrl: true } },
    },
    take: 100,
  });

  const statusClasses: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
    CONFIRMED: "bg-blue-50 text-blue-700",
    SAMPLE_COLLECTED: "bg-indigo-50 text-indigo-700",
    PROCESSING: "bg-violet-50 text-violet-700",
    REPORTS_READY: "bg-teal-50 text-teal-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-rose-50 text-rose-700",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Pending",
    AWAITING_PAYMENT: "Awaiting payment",
    CONFIRMED: "Confirmed",
    SAMPLE_COLLECTED: "Sample collected",
    PROCESSING: "Processing",
    REPORTS_READY: "Results ready",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  return (
    <div className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="pb-6 border-b border-slate-200 md:pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                  <>
                    <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{patient.phone}</h1>
                    <a href="/patient/profile" className="text-xs text-[#2f6ea5] hover:underline">Add your name →</a>
                  </>
                )}
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
          <PatientPortalNav active="labs" phone={urlPhone || patient.phone} />
        </div>

        <div className="space-y-4">
          {labOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No lab orders found yet.
            </div>
          ) : (
            labOrders.map((order) => {
              const tests = normalizeTests(order.tests);
              return (
                <div key={order.id} className="border-b border-slate-100 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Lab order</p>
                      <h2 className="text-lg font-semibold text-slate-900">Order {order.id}</h2>
                      <p className="text-sm text-slate-500">Placed {formatIST(order.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        statusClasses[order.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    {tests.map((test) => (
                      <div key={`${order.id}-${test.name}`} className="flex justify-between">
                        <span>{test.name}</span>
                        <span className="text-slate-500">Qty {test.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    {order.amountPaise && (
                      <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-700">
                        Total {formatINR(order.amountPaise)}
                      </span>
                    )}
                    {order.payment?.receiptUrl && (
                      <a
                        href={order.payment.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                      >
                        Receipt
                      </a>
                    )}
                    {order.resultsPdfKey && (
                      <a
                        href={`/api/patient/lab-orders/results/${order.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M4 16v4h16v-4M12 4v12M8 12l4 4 4-4" />
                        </svg>
                        Download results
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-slate-500">Showing up to 100 of your most recent lab orders.</p>
      </div>

      <PatientMobileTabs />
    </div>
  );
}
