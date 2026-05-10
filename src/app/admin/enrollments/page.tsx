import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";
import SendEnrollmentLink from "./SendEnrollmentLink";

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

export default async function AdminEnrollmentsPage({
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
    prisma.providerEnrollment.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.providerEnrollment.findMany({
      where: filterStatus === "ALL" ? {} : { status: filterStatus },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        speciality: true,
        qualification: true,
        city: true,
        state: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        qualificationDocKey: true,
        registrationDocKey: true,
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">
          Enrollment applications
        </p>
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Provider Enrollments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve provider applications. Approving creates a portal account and notifies
          the provider.
        </p>
      </div>

      {/* Send enrollment link */}
      <SendEnrollmentLink />

      {/* Links to other enrollment types */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/enrollments/pharmacy"
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          Pharmacy enrollments →
        </Link>
        <Link
          href="/admin/enrollments/labs"
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          Lab enrollments →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/enrollments?status=${tab.value}`}
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
      <div className="rounded-3xl border border-white/70 bg-white/90  overflow-hidden">
        {enrollments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            No {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} enrollments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {["Doctor", "Speciality", "Location", "Documents", "Submitted", "Status", ""].map(
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
                      <div className="font-semibold text-slate-900">{e.fullName}</div>
                      <div className="text-xs text-slate-400">{e.email}</div>
                      <div className="text-xs text-slate-400">{e.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{e.speciality}</div>
                      <div className="text-xs text-slate-400">{e.qualification}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {e.city}, {e.state}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {e.qualificationDocKey && (
                          <span className="rounded-full bg-[#2f6ea5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2f6ea5]">
                            Degree
                          </span>
                        )}
                        {e.registrationDocKey && (
                          <span className="rounded-full bg-[#2f6ea5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2f6ea5]">
                            Reg.
                          </span>
                        )}
                        {!e.qualificationDocKey && !e.registrationDocKey && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
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
                        href={`/admin/enrollments/${e.id}`}
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
