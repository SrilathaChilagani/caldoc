import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-50 text-amber-700",
  ACKNOWLEDGED: "bg-emerald-50 text-emerald-700",
};

const PERIODS = [
  "2026-Annual", "2026-H1", "2026-H2",
  "2027-Annual", "2027-H1", "2027-H2",
];

type Props = { searchParams: Promise<{ period?: string; status?: string; q?: string }> };

export default async function ReviewsPage({ searchParams }: Props) {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const { period, status, q } = await searchParams;

  const reviews = await prisma.performanceReview.findMany({
    where: {
      ...(period ? { period } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? { employee: { name: { contains: q, mode: "insensitive" } } }
        : {}),
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true, jobTitle: true } },
    },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const counts = {
    total: reviews.length,
    draft: reviews.filter((r) => r.status === "DRAFT").length,
    submitted: reviews.filter((r) => r.status === "SUBMITTED").length,
    acknowledged: reviews.filter((r) => r.status === "ACKNOWLEDGED").length,
  };

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/hr" className="text-xs font-medium text-[#2f6ea5] hover:underline">← HR Dashboard</Link>
          <h1 className="mt-1 font-serif text-3xl text-slate-900">Performance Reviews</h1>
          <p className="mt-0.5 text-sm text-slate-500">{counts.total} review{counts.total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/hr/reviews/new"
          className="rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
        >
          + New review
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Draft", value: counts.draft, color: "text-slate-700" },
          { label: "Submitted", value: counts.submitted, color: "text-amber-700" },
          { label: "Acknowledged", value: counts.acknowledged, color: "text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search employee…"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        />
        <select
          name="period"
          defaultValue={period ?? ""}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        >
          <option value="">All periods</option>
          {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
        >
          Filter
        </button>
        {(period || status || q) && (
          <Link href="/admin/hr/reviews" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {reviews.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">No reviews found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {["Employee", "Department", "Period", "Reviewer", "Rating", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.employee.name}</p>
                    <p className="text-xs text-slate-400">{r.employee.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.employee.department.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.period}</td>
                  <td className="px-4 py-3 text-slate-600">{r.reviewer.name}</td>
                  <td className="px-4 py-3">
                    {r.overallRating ? (
                      <span className="font-semibold text-slate-900">{r.overallRating}/5</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/hr/reviews/${r.id}`} className="text-xs font-medium text-[#2f6ea5] hover:underline">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
