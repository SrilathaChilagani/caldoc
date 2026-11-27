import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import ComplianceClient from "./ComplianceClient";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  // Summary counts for the top stat row
  const [totalPatients, noConsentCount, pendingDsrCount, openBreachCount] =
    await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { consentAt: null } }),
      prisma.dataSubjectRequest.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.breachNotification.count({
        where: { status: { notIn: ["RESOLVED", "REPORTED_TO_AUTHORITY"] } },
      }),
    ]);

  return (
    <>
      <div>
        <Link href="/admin" className="text-xs font-medium text-[#2f6ea5] hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">DPDP Compliance</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Digital Personal Data Protection Act 2023 — consent, data subject rights, breach log
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total patients" value={totalPatients} />
        <StatCard
          label="Missing consent"
          value={noConsentCount}
          warn={noConsentCount > 0}
        />
        <StatCard
          label="Open DSRs"
          value={pendingDsrCount}
          warn={pendingDsrCount > 0}
        />
        <StatCard
          label="Open breaches"
          value={openBreachCount}
          critical={openBreachCount > 0}
        />
      </div>

      <ComplianceClient />
    </>
  );
}

function StatCard({
  label,
  value,
  warn,
  critical,
}: {
  label: string;
  value: number;
  warn?: boolean;
  critical?: boolean;
}) {
  const bg = critical
    ? "bg-rose-50 border-rose-200"
    : warn
      ? "bg-amber-50 border-amber-200"
      : "bg-white border-slate-200";
  const textColor = critical
    ? "text-rose-700"
    : warn
      ? "text-amber-700"
      : "text-slate-900";

  return (
    <div className={`rounded-2xl border p-5 ${bg}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${textColor}`}>{value}</p>
    </div>
  );
}
