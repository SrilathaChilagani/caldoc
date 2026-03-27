import Link from "next/link";
import { prisma } from "@/lib/db";
import { PATIENT_COOKIE } from "@/lib/patientAuth.server";
import { cookies } from "next/headers";
import { formatINR } from "@/lib/format";
import PatientMobileTabs from "@/components/PatientMobileTabs";
import PatientBookingModal from "@/components/PatientBookingModal";
import PatientPortalNav from "@/components/PatientPortalNav";

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
      <main className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-12">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-slate-700">
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Patient portal</h1>
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

  const labOrders = await prisma.labOrder.findMany({
    where: {
      OR: [
        { patientId: patient.id },
        { patientPhone: { in: candidates } },
        { patientPhone: { contains: last10 } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      payment: true,
    },
    take: 100,
  });

  const statusClasses: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-10">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="pb-6 border-b border-slate-200 md:pb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#2f6ea5] text-2xl font-semibold text-white">
                {(patient.name || "P").charAt(0).toUpperCase()}
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
            Review lab orders, download receipts, and track home collection requests.
          </p>
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
                      {order.status}
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
