import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { IMAGES } from "@/lib/imagePaths";
import RxDeliverySearchBar from "../ui/RxDeliverySearchBar";
import RxDeliverySearchResults from "../ui/RxDeliverySearchResults";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string | string[];
  page?: string | string[];
  all?: string | string[];
  category?: string | string[];
};

type SearchPageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

function getQuery(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]?.trim() || "";
  return value?.trim() || "";
}

export default async function RxDeliverySearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = (await searchParams) || {};
  const query = getQuery(resolvedParams.q);
  const categoryParam = getQuery(resolvedParams.category);
  const pageParam = getQuery(resolvedParams.page);
  const showAll = getQuery(resolvedParams.all) === "1";
  const page = Math.max(1, Number(pageParam) || 1);
  const PAGE_SIZE = 24;
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    "pain-relief": ["paracetamol", "ibuprofen", "dolo", "crocin", "pain"],
    vitamins: ["vitamin", "becosules", "calcium", "shelcal"],
    "skin-care": ["skin", "cream", "ointment"],
    diabetes: ["diabetes", "insulin", "glucose", "metformin"],
    "heart-health": ["heart", "cholesterol", "statin", "aspirin"],
    immunity: ["immunity", "vitamin", "zinc", "cough"],
    digestive: ["pantoprazole", "domperidone", "pan", "digestive", "acid"],
    "womens-health": ["women", "pregnancy", "folic", "calcium"],
  };

  const queryFilter = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { generic: { contains: query, mode: "insensitive" as const } },
          { form: { contains: query, mode: "insensitive" as const } },
          { strength: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : null;

  const keywords = CATEGORY_KEYWORDS[categoryParam] || [];
  const categoryFilter = keywords.length
    ? {
        OR: keywords.flatMap((keyword) => [
          { name: { contains: keyword, mode: "insensitive" as const } },
          { generic: { contains: keyword, mode: "insensitive" as const } },
        ]),
      }
    : null;

  const where =
    queryFilter && categoryFilter ? { AND: [queryFilter, categoryFilter] } : queryFilter || categoryFilter || {};

  const total = await prisma.medication.count({ where });
  const take = showAll ? 240 : PAGE_SIZE;
  const skip = showAll ? 0 : (page - 1) * PAGE_SIZE;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));

  const meds = await prisma.medication.findMany({
    where,
    orderBy: { name: "asc" },
    take,
    skip,
    select: { name: true, generic: true, form: true, strength: true, category: true },
  });

  const compositions = Array.from(
    new Set(meds.map((med) => med.generic?.trim()).filter(Boolean) as string[]),
  ).slice(0, 12);

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-slate-900">
      <section className="relative pb-12 pt-24">
        <div className="absolute inset-0 -z-10">
          <Image src={IMAGES.HERO_PHARMACY} alt="Pharmacy shelves" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2ea]/90 via-[#f7f2ea]/70 to-[#f7f2ea]/30" />
        </div>

        <div className="container mx-auto px-6 lg:px-12">
          <BackButton />
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl leading-tight">Search medicines</h1>
            <p className="mt-3 text-sm text-slate-600">
              Find OTC medicines in our current catalog. Add them to your order in one click.
            </p>
          </div>

          <RxDeliverySearchBar initialQuery={query} category={categoryParam} />
        </div>
      </section>

      <section className="container mx-auto px-6 lg:px-12 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">
              {query ? "Suggested Products" : "Popular in our catalog"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {query ? (
                <span>Showing results for “{query}”.</span>
              ) : (
                <span>Start typing to see more precise results.</span>
              )}
              {categoryParam && (
                <>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e0d5] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {categoryParam.replace(/-/g, " ")}
                    <Link
                      href={`/services/rx-delivery/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                      className="text-[#2f6ea5] hover:text-[#255b8b]"
                    >
                      Clear
                    </Link>
                  </span>
                </>
              )}
            </div>
          </div>
          <span className="text-sm text-slate-500">
            {showAll ? `Showing ${meds.length} of ${total}` : `Showing ${meds.length} of ${total}`}
          </span>
        </div>

        {total > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {!showAll && (
              <span>
                Page {page} of {totalPages}
              </span>
            )}
            <div className="flex flex-wrap gap-3">
              {!showAll && totalPages > 1 && page > 1 && (
                <Link
                  href={`/services/rx-delivery/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                  className="rounded-full border border-[#e7e0d5] px-3 py-1 text-slate-600"
                >
                  Previous
                </Link>
              )}
              {!showAll && totalPages > 1 && page < totalPages && (
                <Link
                  href={`/services/rx-delivery/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                  className="rounded-full border border-[#e7e0d5] px-3 py-1 text-slate-600"
                >
                  Next
                </Link>
              )}
              {!showAll && (
                <Link
                  href={`/services/rx-delivery/search?q=${encodeURIComponent(query)}&all=1`}
                  className="rounded-full border border-[#2f6ea5]/40 px-3 py-1 text-[#2f6ea5]"
                >
                  View All
                </Link>
              )}
              {showAll && (
                <Link
                  href={`/services/rx-delivery/search?q=${encodeURIComponent(query)}`}
                  className="rounded-full border border-[#2f6ea5]/40 px-3 py-1 text-[#2f6ea5]"
                >
                  Paginate
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
            <RxDeliverySearchResults meds={meds} />
          </div>

          <aside className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_40px_-15px_rgba(88,110,132,0.15)]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">Suggested Compositions</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {compositions.length === 0 ? (
                <p>Search to see related compositions.</p>
              ) : (
                compositions.map((item) => (
                  <Link
                    key={item}
                    href={`/services/rx-delivery/search?q=${encodeURIComponent(item)}`}
                    className="block w-full rounded-xl border border-[#e7e0d5] bg-white/70 px-4 py-2 text-sm text-slate-700 hover:border-[#2f6ea5]/40 hover:text-[#2f6ea5]"
                  >
                    {item}
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
