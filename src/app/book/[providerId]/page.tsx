import { notFound } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { prisma } from "@/lib/db";
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

  const resolvedSp = await searchParams;
  const initialSlotId = getInitialSlotId(resolvedSp);

  // Read initial mode from query string (?mode=IN_PERSON)
  const initialMode = (() => {
    if (!resolvedSp) return undefined;
    const raw = isReadonlyURLSearchParams(resolvedSp) ? resolvedSp.get("mode") : (resolvedSp.mode as string | undefined);
    const v = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
    if (v === "IN_PERSON" || v === "VIDEO" || v === "AUDIO") return v as "IN_PERSON" | "VIDEO" | "AUDIO";
    return undefined;
  })();

  // Single query: fetch provider + available slots + clinics together.
  const now = new Date();
  const provider = await prisma.provider.findFirst({
    where: { OR: [{ id: providerId }, { slug: providerId }] },
    select: {
      id: true,
      slug: true,
      name: true,
      speciality: true,
      qualification: true,
      registrationNumber: true,
      councilName: true,
      defaultFeePaise: true,
      visitModes: true,
      clinics: {
        where: { isActive: true },
        select: { id: true, clinicName: true, addressLine1: true, addressLine2: true, city: true, state: true, pincode: true, phone: true },
        take: 3,
      },
      slots: {
        where: { isBooked: false, startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 18,
        select: { id: true, startsAt: true, feePaise: true },
      },
    },
  });

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

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f7f2ea] py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-10 xl:px-12">
        <BookClient
          provider={{
            id: provider.id,
            name: provider.name,
            speciality: provider.speciality,
            qualification: provider.qualification,
            registrationNumber: provider.registrationNumber,
            councilName: provider.councilName,
            defaultFeePaise: provider.defaultFeePaise,
            visitModes: provider.visitModes,
            clinics: provider.clinics,
          }}
          slots={provider.slots.map((s) => ({
            id: s.id,
            startsAt: s.startsAt.toISOString(),
            feePaise: s.feePaise ?? undefined,
          }))}
          initialSlotId={initialSlotId}
          initialMode={initialMode}
        />
      </div>
    </main>
  );
}
