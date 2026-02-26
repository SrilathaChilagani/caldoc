import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ page?: string; action?: string }>;
};

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

const PAGE_SIZE = 50;

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/audit-logs");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10));
  const actionFilter = sp?.action?.trim() || "";

  const where = actionFilter ? { action: { contains: actionFilter } } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (p: number, a?: string) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (a) params.set("action", a);
    return `/admin/audit-logs?${params.toString()}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          System-wide action trail — {total.toLocaleString("en-IN")} entries total.
        </p>
      </div>

      {/* Filter */}
      <form method="GET" action="/admin/audit-logs" className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Filter by action</label>
          <input
            type="text"
            name="action"
            defaultValue={actionFilter}
            placeholder="e.g. APPOINTMENT_CANCELLED"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30"
          />
        </div>
        <input type="hidden" name="page" value="1" />
        <button
          type="submit"
          className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
        >
          Search
        </button>
        {actionFilter && (
          <a
            href="/admin/audit-logs"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400"
          >
            Clear
          </a>
        )}
      </form>

      {/* Table */}
      <section className="rounded-3xl border border-white/70 bg-white/90 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4">Time (IST)</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Actor type</th>
                <th className="px-5 py-4">Actor ID</th>
                <th className="px-5 py-4">Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatIST(log.at)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{log.actorType}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">
                      {log.actorId ? log.actorId.slice(-12) : "—"}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <pre className="text-[11px] text-slate-500 whitespace-pre-wrap break-all">
                        {JSON.stringify(log.meta, null, 2).slice(0, 300)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total.toLocaleString("en-IN")} entries
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={buildUrl(page - 1, actionFilter)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={buildUrl(page + 1, actionFilter)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
