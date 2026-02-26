import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 50;

export default async function AdminPatientsPage({ searchParams }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/patients");

  const sp = await searchParams;
  const query = sp?.q?.trim() || "";
  const page = Math.max(1, parseInt(sp?.page || "1", 10));

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        dob: true,
        createdAt: true,
        consentAt: true,
        _count: {
          select: { appointments: true, labOrders: true, rxOrders: true },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (p: number, q?: string) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (q) params.set("q", q);
    return `/admin/patients?${params.toString()}`;
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Patients</h1>
        <p className="mt-1 text-sm text-slate-500">
          {total.toLocaleString("en-IN")} registered patients
        </p>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/patients" className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Name, phone, or email"
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
        {query && (
          <a
            href="/admin/patients"
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
                <th className="px-5 py-4">Patient</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">DOB</th>
                <th className="px-5 py-4">Registered</th>
                <th className="px-5 py-4">Consent</th>
                <th className="px-5 py-4 text-center">Appts</th>
                <th className="px-5 py-4 text-center">Labs</th>
                <th className="px-5 py-4 text-center">Rx</th>
                <th className="px-5 py-4">Links</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-slate-400">
                    {query ? "No patients matched your search." : "No patients registered yet."}
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.id.slice(-10)}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{p.phone}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{p.email || "—"}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {p.dob ? formatIST(p.dob) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatIST(p.createdAt)}</td>
                    <td className="px-5 py-3">
                      {p.consentAt ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-900">{p._count.appointments}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-900">{p._count.labOrders}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-900">{p._count.rxOrders}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/appointments?patientId=${p.id}`}
                        className="text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                      >
                        View appts →
                      </Link>
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
              Page {page} of {totalPages} · {total.toLocaleString("en-IN")} patients
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={buildUrl(page - 1, query)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={buildUrl(page + 1, query)}
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
