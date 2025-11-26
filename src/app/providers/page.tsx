import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const languageLabels: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
  ur: "Urdu",
  bn: "Bengali",
  mr: "Marathi",
};

function formatLanguage(code: string) {
  const key = code.toLowerCase();
  return languageLabels[key] || code;
}

function formatSlot(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type PageProps = {
  searchParams?: Promise<{ q?: string; specialty?: string }>;
};

export default async function ProvidersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  const q = (sp.q || "").trim();
  const specialty = (sp.specialty || "").trim();

  const filters: Prisma.ProviderWhereInput[] = [];
  if (specialty) {
    filters.push({ speciality: { contains: specialty, mode: "insensitive" } });
  }
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    const termClauses = terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { speciality: { contains: term, mode: "insensitive" } },
        { languages: { has: term.toUpperCase() } },
        { slug: { contains: term, mode: "insensitive" } },
        { licenseNo: { contains: term, mode: "insensitive" } },
      ],
    }));
    filters.push(...termClauses);
  }

  const whereClause: Prisma.ProviderWhereInput | undefined = filters.length
    ? { AND: filters }
    : undefined;

  const providers = await prisma.provider.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      speciality: true,
      qualification: true,
      languages: true,
      is24x7: true,
      slots: {
        where: {
          isBooked: false,
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: { id: true, startsAt: true },
      },
    },
  });

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f7f9fc] py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Back to home
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h1 className="text-3xl font-semibold text-slate-900">Find a doctor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search by specialty, name, registration number, or language. Click a slot to jump straight to booking.
          </p>
          <form method="GET" className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search specialties, doctor names, symptoms, or registration number"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <input type="hidden" name="specialty" value={specialty} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {providers.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center text-sm text-slate-500">
              No providers matched this search. Try adjusting the filters.
            </div>
          )}

          {providers.map((provider) => {
            const displayedSlots = provider.slots.slice(0, 3);
            return (
              <div
                key={provider.id}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{provider.name}</p>
                    <p className="text-sm text-slate-600">{provider.speciality}</p>
                    {provider.qualification && (
                      <p className="text-xs text-slate-500">{provider.qualification}</p>
                    )}
                    {provider.languages.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Languages: {provider.languages.map(formatLanguage).join(", ")}
                      </p>
                    )}
                    {provider.is24x7 && (
                      <p className="text-xs font-medium text-emerald-600">Available 24x7</p>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-end">
                    <div className="flex flex-col items-start gap-1 md:items-end">
                      <p className="text-xs font-semibold uppercase text-slate-500">Next availability</p>
                      <div className="flex flex-wrap gap-2">
                        {displayedSlots.length === 0 ? (
                          <span className="rounded-2xl border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-400">
                            No slots open
                          </span>
                        ) : (
                          displayedSlots.map((slot) => (
                            <Link
                              key={slot.id}
                              href={`/book/${encodeURIComponent(provider.slug || provider.id)}?slot=${slot.id}`}
                              className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:border-blue-200 hover:bg-blue-100"
                            >
                              {formatSlot(new Date(slot.startsAt))}
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/book/${encodeURIComponent(provider.slug || provider.id)}`}
                      className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Book provider
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
