import { notFound } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProviderBySlugOrId } from "@/lib/provider";
import BookClient from "./ui/BookClient";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type SearchParamsInput =
  | ReadonlyURLSearchParams
  | {
      [key: string]: SearchParamValue;
    };

type PageProps = {
  params: Promise<{ providerId?: string } | undefined>;
  searchParams?: Promise<SearchParamsInput | undefined>;
};

function isReadonlyURLSearchParams(value: unknown): value is ReadonlyURLSearchParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "get" in value &&
    typeof (value as Record<string, unknown>).get === "function"
  );
}

function getInitialSlotId(sp?: SearchParamsInput) {
  if (!sp) return undefined;
  if (isReadonlyURLSearchParams(sp)) {
    return sp.get("slot") ?? undefined;
  }
  const raw = sp.slot;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const resolvedParams = (await params) ?? {};
  const providerId = resolvedParams.providerId;

  if (!providerId) {
    notFound();
  }

  const initialSlotId = getInitialSlotId(await searchParams);

  const provider = await getProviderBySlugOrId(providerId);
  if (!provider) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-semibold">Provider not found</h1>
        <p className="mt-2 text-sm text-zinc-600">
          We couldn&apos;t find a provider for: <code className="font-mono">{providerId}</code>
        </p>
      </main>
    );
  }

  const now = new Date();
  const slots = await prisma.slot.findMany({
    where: {
      providerId: provider.id,
      isBooked: false,
      startsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: 18,
    select: { id: true, startsAt: true, feePaise: true },
  });

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f7f9fc] py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <BookClient
          provider={{
            id: provider.id,
            name: provider.name,
            speciality: provider.speciality,
            qualification: provider.qualification,
            registrationNumber: provider.registrationNumber,
            councilName: provider.councilName,
            defaultFeePaise: provider.defaultFeePaise,
          }}
          slots={slots.map((s) => ({
            id: s.id,
            startsAt: s.startsAt.toISOString(),
            feePaise: s.feePaise ?? undefined,
          }))}
          initialSlotId={initialSlotId}
        />
      </div>
    </main>
  );
}
