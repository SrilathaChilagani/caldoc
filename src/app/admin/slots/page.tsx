import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import SlotGeneratorForm from "./SlotGeneratorForm";
import { buildProviderWhere } from "../utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ q?: string; providerId?: string }>;
};

export default async function AdminSlotsPage({ searchParams }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/slots");

  const sp = (await searchParams) ?? {};
  const providerQuery = sp.q?.trim() || "";
  const preselectedId = sp.providerId?.trim() || "";

  const providers = await prisma.provider.findMany({
    where: buildProviderWhere(providerQuery),
    orderBy: { name: "asc" },
    select: { id: true, name: true, speciality: true, licenseNo: true },
    take: 50,
  });

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Schedule slots</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bulk-generate availability windows for providers.
        </p>
      </div>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row mb-6">
          <input
            type="search"
            name="q"
            defaultValue={providerQuery}
            placeholder="Search providers by name or speciality"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
          <button
            type="submit"
            className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
          >
            Search
          </button>
          {providerQuery && (
            <Link
              href="/admin/slots"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            >
              Clear
            </Link>
          )}
        </form>

        <SlotGeneratorForm providers={providers} preselectedId={preselectedId} />
      </section>
    </>
  );
}
