import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import SlotGeneratorForm from "./SlotGeneratorForm";
import { buildProviderWhere } from "../utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminSlotsPage({ searchParams }: PageProps) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/provider/login?next=/admin/slots");

  const sp = (await searchParams) ?? {};
  const providerQuery = sp.q?.trim() || "";

  const providers = await prisma.provider.findMany({
    where: buildProviderWhere(providerQuery),
    orderBy: { name: "asc" },
    select: { id: true, name: true, speciality: true, licenseNo: true },
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
          <h1 className="text-2xl font-semibold text-slate-900">Slot generator</h1>
          <p className="text-sm text-slate-500">
            Search for a provider or enter an ID, then bulk-generate slots.
          </p>
        </div>
      </div>

      <form method="GET" className="flex flex-col gap-3 md:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={providerQuery}
          placeholder="Search providers"
          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <SlotGeneratorForm providers={providers} />
    </main>
  );
}
