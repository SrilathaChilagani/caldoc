import Image from "next/image";
import { LAB_TEST_OPTIONS } from "@/lib/labTests";
import { IMAGES } from "@/lib/imagePaths";
import LabsSearchBar from "../ui/LabsSearchBar";
import LabsSearchResults from "../ui/LabsSearchResults";
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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "blood-tests": ["blood", "cbc", "metabolic", "lipid", "hba1c", "thyroid", "vitamin", "urinalysis", "liver", "kidney", "crp", "ferritin", "electrolytes"],
  imaging: ["imaging", "scan", "ct", "mri"],
  pathology: ["pathology", "urinalysis", "crp", "ferritin"],
  ultrasound: ["ultrasound"],
  ecg: ["ecg"],
  "x-ray": ["x-ray", "xray"],
  allergy: ["allergy"],
  "covid-19": ["covid", "rt-pcr"],
};

function filterTests(query: string, category: string) {
  let base = LAB_TEST_OPTIONS;
  const keywords = CATEGORY_KEYWORDS[category] || [];
  if (keywords.length) {
    base = base.filter((test) =>
      keywords.some((keyword) => test.toLowerCase().includes(keyword)),
    );
  }
  if (!query) return base;
  const lower = query.toLowerCase();
  return base.filter((test) => test.toLowerCase().includes(lower));
}

export default async function LabsAtHomeSearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = (await searchParams) || {};
  const query = getQuery(resolvedParams.q);
  const categoryParam = getQuery(resolvedParams.category);
  const pageParam = getQuery(resolvedParams.page);
  const showAll = getQuery(resolvedParams.all) === "1";
  const page = Math.max(1, Number(pageParam) || 1);
  const PAGE_SIZE = 12;

  const filtered = filterTests(query, categoryParam);
  const total = filtered.length;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const take = showAll ? 120 : PAGE_SIZE;
  const start = showAll ? 0 : (page - 1) * PAGE_SIZE;
  const tests = filtered.slice(start, start + take);

  const suggestions = filtered.slice(0, 10);

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-slate-900">
      <section className="relative pb-12 pt-24">
        <div className="absolute inset-0 -z-10">
          <Image src={IMAGES.HERO_LABS} alt="Laboratory equipment" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2ea]/90 via-[#f7f2ea]/70 to-[#f7f2ea]/30" />
        </div>

        <div className="container mx-auto px-6 lg:px-12">
          <BackButton />
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl leading-tight">Search lab tests</h1>
            <p className="mt-3 text-sm text-slate-600">
              Find lab tests and packages. Add them to your order in one click.
            </p>
          </div>

          <LabsSearchBar initialQuery={query} category={categoryParam} />
        </div>
      </section>

      <section className="container mx-auto px-6 lg:px-12 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">{query ? "Suggested Tests" : "Popular tests"}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {query ? (
                <span>Showing results for “{query}”.</span>
              ) : (
                <span>Start typing to see more precise results.</span>
              )}
              {categoryParam && (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e0d5] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {categoryParam.replace(/-/g, " ")}
                  <a
                    href={`/services/labs-at-home/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                    className="text-[#2f6ea5] hover:text-[#255b8b]"
                  >
                    Clear
                  </a>
                </span>
              )}
            </div>
          </div>
          <span className="text-sm text-slate-500">Showing {tests.length} of {total}</span>
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
                <a
                  href={`/services/labs-at-home/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                  className="rounded-full border border-[#e7e0d5] px-3 py-1 text-slate-600"
                >
                  Previous
                </a>
              )}
              {!showAll && totalPages > 1 && page < totalPages && (
                <a
                  href={`/services/labs-at-home/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                  className="rounded-full border border-[#e7e0d5] px-3 py-1 text-slate-600"
                >
                  Next
                </a>
              )}
              {!showAll && (
                <a
                  href={`/services/labs-at-home/search?q=${encodeURIComponent(query)}&all=1`}
                  className="rounded-full border border-[#2f6ea5]/40 px-3 py-1 text-[#2f6ea5]"
                >
                  View All
                </a>
              )}
              {showAll && (
                <a
                  href={`/services/labs-at-home/search?q=${encodeURIComponent(query)}`}
                  className="rounded-full border border-[#2f6ea5]/40 px-3 py-1 text-[#2f6ea5]"
                >
                  Paginate
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
            <LabsSearchResults tests={tests} />
          </div>

          <aside className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_40px_-15px_rgba(88,110,132,0.15)]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">Suggested Tests</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {suggestions.length === 0 ? (
                <p>Search to see related tests.</p>
              ) : (
                suggestions.map((item) => (
                  <a
                    key={item}
                    href={`/services/labs-at-home/search?q=${encodeURIComponent(item)}`}
                    className="block w-full rounded-xl border border-[#e7e0d5] bg-white/70 px-4 py-2 text-sm text-slate-700 hover:border-[#2f6ea5]/40 hover:text-[#2f6ea5]"
                  >
                    {item}
                  </a>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
