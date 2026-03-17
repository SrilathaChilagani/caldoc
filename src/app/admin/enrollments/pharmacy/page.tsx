import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatDate(d: Date) {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PharmacyEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login");

  const { status = "PENDING" } = await searchParams;
  const validStatuses = ["PENDING", "APPROVED", "REJECTED", "ALL"];
  const filterStatus = validStatuses.includes(status) ? status : "PENDING";

  const [counts, enrollments] = await Promise.all([
    prisma.pharmacyEnrollment.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.pharmacyEnrollment.findMany({
      where: filterStatus === "ALL" ? {} : { status: filterStatus },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        pharmacyName: true,
        contactName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        drugLicenseNumber: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count.status]));
  const pendingCount = countMap.get("PENDING") || 0;
  const approvedCount = countMap.get("APPROVED") || 0;
  const rejectedCount = countMap.get("REJECTED") || 0;

  const tabs = [
    { label: `Pending (${pendingCount})`, value: "PENDING" },
    { label: `Approved (${approvedCount})`, value: "APPROVED" },
    { label: `Rejected (${rejectedCount})`, value: "REJECTED" },
    { label: "All", value: "ALL" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/enrollments"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          ← Enrollments
        </Link>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">
          Partner applications
        </p>
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Pharmacy Enrollments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve pharmacy partner applications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/enrollments/pharmacy?status=${tab.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filterStatus === tab.value
                ? "bg-[#2f6ea5] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        {enrollments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            No {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} pharmacy enrollments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {["Pharmacy", "Contact", "Location", "Drug License", "Submitted", "Status", ""].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{e.pharmacyName}</div>
                      <div className="text-xs text-slate-400">{e.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{e.contactName}</div>
                      <div className="text-xs text-slate-400">{e.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {e.city}, {e.state}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                      {e.drugLicenseNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[e.status] || "bg-slate-50 text-slate-500"}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/enrollments/pharmacy/${e.id}`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
