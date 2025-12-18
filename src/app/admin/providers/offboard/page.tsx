import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import ProviderStatusToggle from "../ProviderStatusToggle";
import { buildProviderWhere } from "../../utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminProviderOffboard({ searchParams }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/providers/offboard");

  const sp = (await searchParams) ?? {};
  const providerQuery = sp.q?.trim() || "";

  const providers = await prisma.provider.findMany({
    where: buildProviderWhere(providerQuery),
    orderBy: { name: "asc" },
    select: { id: true, name: true, speciality: true, licenseNo: true, isActive: true },
    take: 50,
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin"
          className="w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
        >
          ← Back to dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Provider off-boarding</h1>
          <p className="text-sm text-slate-500">Search for a doctor and toggle whether they appear on the marketplace.</p>
        </div>
      </div>

      <form method="GET" className="flex flex-col gap-3 md:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={providerQuery}
          placeholder="Search by name, specialty, license or ID"
          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {providers.length === 0 ? (
          <p className="text-sm text-slate-500">No providers matched this search.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {providers.map((p) => (
              <li key={p.id} className="py-3">
                <div className="font-medium text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.speciality} · License {p.licenseNo}
                </div>
                <div className="mt-2 text-xs text-slate-500">ID: {p.id}</div>
                <ProviderStatusToggle providerId={p.id} initialActive={p.isActive} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
