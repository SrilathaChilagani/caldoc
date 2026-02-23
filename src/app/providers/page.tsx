import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { FiltersPanel } from "./FiltersPanel";
import { IMAGES } from "@/lib/imagePaths";

export const dynamic = "force-dynamic";

// Specialty list changes rarely — cache it for 5 minutes to avoid a DB round-trip on every request.
const getCachedSpecialties = unstable_cache(
  () =>
    prisma.provider.findMany({
      select: { speciality: true },
      distinct: ["speciality"],
      orderBy: { speciality: "asc" },
    }),
  ["provider-specialties"],
  { revalidate: 300 }
);

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

function formatFee(paise?: number | null) {
  if (typeof paise !== "number" || Number.isNaN(paise) || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

const availabilityOptions = [
  { value: "next30", label: "Available in next 30 mins" },
  { value: "today", label: "Available today" },
  { value: "week", label: "Available this week" },
];

const genderOptions = [
  { value: "female", label: "Female doctors" },
  { value: "male", label: "Male doctors" },
  { value: "any", label: "Any" },
];

const experienceOptions = [
  { value: "lt5", label: "0 – 5 years" },
  { value: "btw5and10", label: "5 – 10 years" },
  { value: "gt10", label: "10+ years" },
];

const genderLabels: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other / undisclosed",
};

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput =
  | Promise<Record<string, SearchParamValue>>
  | Record<string, SearchParamValue>
  | undefined;

const providerMeta: Record<
  string,
  {
    gender: "male" | "female" | "other";
    experience: number | null;
  }
> = {
  "dr-asha-menon": { gender: "female", experience: 12 },
  "dr-rohan-iyer": { gender: "male", experience: 8 },
  "dr-saira-khan": { gender: "female", experience: 10 },
};

function toArray(value: SearchParamValue): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function deriveMeta(slug: string | null | undefined) {
  if (slug && providerMeta[slug]) {
    return providerMeta[slug];
  }
  return { gender: "other" as const, experience: null };
}

function computeExperienceMatch(range: string | null, experience: number | null) {
  if (!range || !experience || Number.isNaN(experience)) return true;
  if (range === "lt5") return experience < 5;
  if (range === "btw5and10") return experience >= 5 && experience <= 10;
  if (range === "gt10") return experience > 10;
  return true;
}

type PageProps = {
  searchParams?: SearchParamsInput;
};

export default async function ProvidersPage({ searchParams }: PageProps) {
  const resolvedParams =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const q = (resolvedParams.q as string | undefined)?.trim() ?? "";
  const patientName =
    typeof resolvedParams.patientName === "string"
      ? resolvedParams.patientName.trim()
      : Array.isArray(resolvedParams.patientName)
      ? resolvedParams.patientName[0]?.trim() ?? ""
      : "";
  const patientPhone =
    typeof resolvedParams.patientPhone === "string"
      ? resolvedParams.patientPhone.trim()
      : Array.isArray(resolvedParams.patientPhone)
      ? resolvedParams.patientPhone[0]?.trim() ?? ""
      : "";
  const embed =
    typeof resolvedParams.embed === "string"
      ? resolvedParams.embed.trim()
      : Array.isArray(resolvedParams.embed)
      ? resolvedParams.embed[0]?.trim() ?? ""
      : "";
  const selectedSpecialties = new Set(toArray(resolvedParams.specialty));
  const selectedAvailability =
    typeof resolvedParams.availability === "string"
      ? resolvedParams.availability
      : Array.isArray(resolvedParams.availability)
      ? resolvedParams.availability[0] ?? ""
      : "";
  const selectedLanguages = new Set(toArray(resolvedParams.languages));
  const selectedGenderValues = toArray(resolvedParams.gender);
  const genderAnySelected =
    selectedGenderValues.length === 0 || selectedGenderValues.includes("any");
  const selectedGenders = genderAnySelected
    ? new Set<string>()
    : new Set(selectedGenderValues);
  const selectedExperience =
    typeof resolvedParams.experience === "string"
      ? resolvedParams.experience
      : Array.isArray(resolvedParams.experience)
      ? resolvedParams.experience[0] ?? ""
      : "";
  const selectedConsultationTypes = new Set(toArray(resolvedParams.consultationType));

  const INSENSITIVE: Prisma.QueryMode = "insensitive";

  const filters: Prisma.ProviderWhereInput[] = [];
  if (selectedSpecialties.size) {
    filters.push({
      OR: Array.from(selectedSpecialties).map((spec) => ({
        speciality: { contains: spec, mode: INSENSITIVE },
      })),
    });
  }
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    const termClauses = terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: INSENSITIVE } },
        { speciality: { contains: term, mode: INSENSITIVE } },
        { languages: { has: term.toUpperCase() } },
        { slug: { contains: term, mode: INSENSITIVE } },
        { licenseNo: { contains: term, mode: INSENSITIVE } },
      ],
    }));
    filters.push(...termClauses);
  }

  if (selectedLanguages.size) {
    filters.push({
      languages: {
        hasSome: Array.from(selectedLanguages).map((lang) => lang.toLowerCase()),
      },
    });
  }

  const now = new Date();
  const availabilityFilter = (() => {
    if (selectedAvailability === "next30") {
      const end = new Date(now.getTime() + 30 * 60000);
      return { gte: now, lte: end };
    }
    if (selectedAvailability === "today") {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { gte: now, lte: end };
    }
    if (selectedAvailability === "week") {
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60000);
      return { gte: now, lte: end };
    }
    return null;
  })();

  if (availabilityFilter) {
    filters.push({
      slots: {
        some: {
          isBooked: false,
          startsAt: { gte: availabilityFilter.gte, lte: availabilityFilter.lte },
        },
      },
    });
  }

  const whereClause: Prisma.ProviderWhereInput | undefined = filters.length
    ? { AND: filters }
    : undefined;

  const [providers, specialtyList] = await Promise.all([
    prisma.provider.findMany({
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
        defaultFeePaise: true,
        profilePhotoKey: true,
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
    }),
    getCachedSpecialties(),
  ]);

  const filteredProviders = providers.filter((provider) => {
    const meta = deriveMeta(provider.slug);
    if (selectedGenders.size && !selectedGenders.has(meta.gender)) {
      return false;
    }
    if (
      selectedExperience &&
      !computeExperienceMatch(selectedExperience, meta.experience)
    ) {
      return false;
    }
    return true;
  });

  const specialtyOptions = specialtyList
    .map((item) => item.speciality)
    .filter((spec): spec is string => Boolean(spec));

  const withPrefill = (href: string) => {
    if (!patientName && !patientPhone && !embed) return href;
    const url = new URL(href, "https://caldoc.in");
    if (patientName) url.searchParams.set("patientName", patientName);
    if (patientPhone) url.searchParams.set("patientPhone", patientPhone);
    if (embed) url.searchParams.set("embed", embed);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f7f2ea] py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
        >
          ← Back to home
        </Link>
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Find a doctor</h1>
          <form method="GET" className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search specialties, doctor names, symptoms, or registration number"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:ring-1 focus:ring-[#2f6ea5]"
            />
            {patientName && <input type="hidden" name="patientName" value={patientName} />}
            {patientPhone && <input type="hidden" name="patientPhone" value={patientPhone} />}
            {embed && <input type="hidden" name="embed" value={embed} />}
            {Array.from(selectedSpecialties).map((spec) => (
              <input key={`search-specialty-${spec}`} type="hidden" name="specialty" value={spec} />
            ))}
            {selectedAvailability && (
              <input type="hidden" name="availability" value={selectedAvailability} />
            )}
            {selectedExperience && (
              <input type="hidden" name="experience" value={selectedExperience} />
            )}
            {Array.from(selectedLanguages).map((lang) => (
              <input key={`search-language-${lang}`} type="hidden" name="languages" value={lang} />
            ))}
            {Array.from(selectedGenders).map((gender) => (
              <input key={`search-gender-${gender}`} type="hidden" name="gender" value={gender} />
            ))}
            {Array.from(selectedConsultationTypes).map((type) => (
              <input key={`search-consultationType-${type}`} type="hidden" name="consultationType" value={type} />
            ))}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[#2f6ea5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#255b8b]"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <FiltersPanel
            specialtyList={specialtyOptions}
            selectedSpecialties={Array.from(selectedSpecialties)}
            selectedAvailability={selectedAvailability}
            selectedExperience={selectedExperience}
            selectedGenders={genderAnySelected ? [] : Array.from(selectedGenders)}
            genderAnySelected={genderAnySelected}
            selectedLanguages={Array.from(selectedLanguages)}
            selectedConsultationTypes={Array.from(selectedConsultationTypes)}
            q={q}
            languageLabels={languageLabels}
            patientName={patientName}
            patientPhone={patientPhone}
            embed={embed}
          />

          <section className="flex-1 space-y-4">
            {filteredProviders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center text-sm text-slate-500">
                No providers matched this search. Try adjusting the filters.
              </div>
            ) : (
              filteredProviders.map((provider) => {
                const displayedSlots = provider.slots.slice(0, 3);
                const feeLabel = formatFee(provider.defaultFeePaise);
                const meta = deriveMeta(provider.slug);
                const photoToken = provider.profilePhotoKey
                  ? encodeURIComponent(provider.profilePhotoKey)
                  : null;
                const photoUrl = photoToken
                  ? `/api/providers/${provider.slug}/photo?v=${photoToken}`
                  : IMAGES.DOC_PLACEHOLDER;
                return (
                  <article
                    key={provider.id}
                    className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative h-24 w-24 overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50">
                          <Image src={photoUrl} alt={provider.name} fill className="object-cover" sizes="96px" />
                        </div>
                        <div>
                        <p className="text-lg font-semibold text-slate-900">{provider.name}</p>
                        <p className="text-sm text-slate-600">{provider.speciality}</p>
                        {provider.qualification && (
                          <p className="text-xs text-slate-500">{provider.qualification}</p>
                        )}
                        {(meta.gender || meta.experience) && (
                          <p className="text-xs text-slate-500">
                            {meta.gender ? `Gender: ${genderLabels[meta.gender] || "Other"}` : ""}
                            {meta.gender && meta.experience ? " · " : ""}
                            {meta.experience ? `Experience: ${meta.experience}+ years` : ""}
                          </p>
                        )}
                        {provider.languages.length > 0 && (
                          <p className="text-xs text-slate-500">
                            Languages: {provider.languages.map(formatLanguage).join(", ")}
                          </p>
                        )}
                        {feeLabel && (
                          <p className="text-xs font-semibold text-slate-600">Consultation fee: {feeLabel}</p>
                        )}
                        {provider.is24x7 && (
                          <p className="text-xs font-medium text-emerald-600">Available 24x7</p>
                        )}
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-end">
                        <div className="flex flex-col items-start gap-1 text-left md:items-end md:text-right">
                          <p className="text-xs font-semibold uppercase text-slate-500">Next availability</p>
                          <div className="flex w-full flex-col gap-2 md:w-auto">
                            {displayedSlots.length === 0 ? (
                              <span className="rounded-2xl border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-400 md:self-end">
                                No slots open
                              </span>
                            ) : (
                              displayedSlots.map((slot) => (
                                <Link
                                  key={slot.id}
                                  href={withPrefill(
                                    `/book/${encodeURIComponent(provider.slug || provider.id)}?slot=${slot.id}`,
                                  )}
                                  className="inline-flex min-w-[160px] justify-center rounded-2xl border border-[#2f6ea5]/20 bg-[#e7edf3] px-3 py-1 text-xs font-semibold text-[#2f6ea5] hover:border-[#2f6ea5]/40 hover:bg-[#d9e4ee] md:self-end"
                                >
                                  {formatSlot(new Date(slot.startsAt))}
                                </Link>
                              ))
                            )}
                          </div>
                        </div>
                        <Link
                          href={withPrefill(`/book/${encodeURIComponent(provider.slug || provider.id)}`)}
                          className="inline-flex items-center justify-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
                        >
                          Book doctor
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
