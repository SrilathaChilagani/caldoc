import { prisma } from "@/lib/db";
import { getProviderBySlugOrId } from "@/lib/provider";
import BookClient from "./ui/BookClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ providerId: string }>;
  searchParams?: Promise<{ slot?: string }>;
};

export default async function BookPage({ params, searchParams }: PageProps) {
  const { providerId } = await params;
  const sp = (await searchParams) || {};
  const initialSlotId = sp.slot;

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

  const slots = await prisma.slot.findMany({
    where: { providerId: provider.id, isBooked: false },
    orderBy: { startsAt: "asc" },
    take: 18,
    select: { id: true, startsAt: true },
  });

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f7f9fc] py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs uppercase text-slate-500">Teleconsultation</p>
          <h1 className="text-3xl font-semibold text-slate-900">Book {provider.name}</h1>
          <p className="text-sm text-slate-600">
            {provider.speciality}
            {provider.qualification && <> · {provider.qualification}</>}
          </p>
          {provider.registrationNumber && (
            <p className="text-xs text-slate-500">
              Reg. No: <span className="font-mono">{provider.registrationNumber}</span>
              {provider.councilName && <> ({provider.councilName})</>}
            </p>
          )}
        </div>

        <BookClient
          provider={{
            id: provider.id,
            name: provider.name,
            speciality: provider.speciality,
            qualification: provider.qualification,
          }}
          slots={slots.map((s) => ({ id: s.id, startsAt: s.startsAt.toISOString() }))}
          initialSlotId={initialSlotId}
        />
      </div>
    </main>
  );
}
