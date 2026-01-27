import Image from "next/image";
import Link from "next/link";
import DisclaimerNotice from "@/components/DisclaimerNotice";
import OfflineRequestForm from "@/components/OfflineRequestForm";
import { prisma } from "@/lib/db";
import { IMAGES } from "@/lib/imagePaths";

const specialties = [
  { name: "Dermatology", slug: "dermatology", img: IMAGES.SPEC_DERM },
  { name: "Pediatrics", slug: "pediatrics", img: IMAGES.SPEC_PEDS },
  { name: "Cardiology", slug: "cardiology", img: IMAGES.SPEC_CARD },
  { name: "ENT", slug: "ent", img: IMAGES.SPEC_ENT },
  { name: "Orthopedics", slug: "orthopedics", img: IMAGES.SPEC_ORTHO },
  { name: "Psychiatry", slug: "psychiatry", img: IMAGES.SPEC_PSYCH },
];

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

type ProviderCard = {
  id: string;
  slug: string | null;
  name: string;
  speciality: string | null;
  qualification: string | null;
  languages: string[];
};

const FALLBACK_PROVIDERS: ProviderCard[] = [
  {
    id: "fallback-1",
    slug: "telemedist",
    name: "Dr. Tele Medist",
    speciality: "General Medicine",
    qualification: "MBBS, MD",
    languages: ["en", "hi"],
  },
  {
    id: "fallback-2",
    slug: "rural-care",
    name: "Dr. Rural Care",
    speciality: "Family Physician",
    qualification: "MBBS",
    languages: ["en", "te"],
  },
  {
    id: "fallback-3",
    slug: "women-health",
    name: "Dr. Women Health",
    speciality: "Gynecology",
    qualification: "MBBS, DGO",
    languages: ["en", "ta"],
  },
];

export default async function Home() {
  let featuredProviders: ProviderCard[] = FALLBACK_PROVIDERS;

  try {
    const topAppointments = await prisma.appointment.groupBy({
      by: ["providerId"],
      _count: { providerId: true },
      orderBy: { _count: { providerId: "desc" } },
      take: 3,
    });

    const topIds = topAppointments.map((t) => t.providerId);

    featuredProviders = await prisma.provider.findMany({
      where: topIds.length ? { id: { in: topIds } } : undefined,
      select: {
        id: true,
        slug: true,
        name: true,
        speciality: true,
        qualification: true,
        languages: true,
      },
    });

    if (featuredProviders.length < 3) {
      const fillers = await prisma.provider.findMany({
        orderBy: { name: "asc" },
        take: 3,
        select: {
          id: true,
          slug: true,
          name: true,
          speciality: true,
          qualification: true,
          languages: true,
        },
      });
      featuredProviders = fillers;
    } else {
      const order = new Map(topIds.map((id, idx) => [id, idx]));
      featuredProviders.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
  } catch (err) {
    console.warn("Falling back to static featured providers:", err);
    featuredProviders = FALLBACK_PROVIDERS;
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section
        className="relative overflow-hidden bg-white"
        style={{
          backgroundImage:
            `linear-gradient(rgba(255,255,255,0.68), rgba(255,255,255,0.85)), url(${IMAGES.HOMEPAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative container mx-auto px-4 pt-14 pb-20 md:pt-16 md:pb-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-6 flex-1">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Book your teleconsultations today.
              </h1>
            <p className="text-lg text-gray-600">Search by specialty, doctor name, or diagnosis to find the right care.</p>

            <form
              action="/providers"
              method="GET"
              className="flex w-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:flex-row md:items-center"
            >
              <input
                name="q"
                placeholder="Search doctors, specialties, symptoms…"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <input
                name="specialty"
                placeholder="Specialty (optional)"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:w-56"
              />
              <button
                type="submit"
                className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Find a doctor
              </button>
            </form>

            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span>✔ WhatsApp confirmations</span>
              <span>✔ UPI / cards</span>
              <span>✔ Instant video links</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/services/rx-delivery"
                className="inline-flex min-w-[260px] items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Pharmacy
              </Link>
              <Link
                href="/services/labs-at-home"
                className="inline-flex min-w-[260px] items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Labs
              </Link>
            </div>
            </div>

            <div className="flex flex-1 justify-center lg:justify-end">
              <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/70 bg-white/80 p-3 shadow-2xl shadow-blue-100/70 backdrop-blur lg:max-w-md xl:max-w-lg">
                <div className="relative h-60 w-full overflow-hidden rounded-[24px] sm:h-64 md:h-72 lg:h-[18rem] xl:h-[20rem]">
                  <Image
                    src={IMAGES.TEAM}
                    alt="CalDoc care team standing together"
                    fill
                    priority
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="specialties" className="bg-white">
        <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold md:text-3xl">Browse by specialty</h2>
          <Link href="/providers" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            See all doctors →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {specialties.map((s) => (
            <Link
              key={s.slug}
              href={`/providers?specialty=${encodeURIComponent(s.slug)}`}
              className="group rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image src={s.img} alt={s.name} fill className="object-cover transition group-hover:scale-105" priority />
              </div>
              <div className="mt-2 text-sm font-medium text-gray-800">{s.name}</div>
            </Link>
          ))}
        </div>
        </div>
      </section>

      {false && (
      <section className="bg-[#f6f8ff]">
        <div className="container mx-auto flex flex-col gap-8 px-4 py-12 md:flex-row md:items-start">
          <div className="flex-1 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-500">Rural access</p>
            <h2 className="text-2xl font-semibold text-slate-900">Low-bandwidth & offline support</h2>
            <p className="text-sm text-slate-600">
              Borrowing from eSanjeevani&apos;s playbook, CalDoc lets you switch to audio-only consults or leave an
              offline request if connectivity drops.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Pick “Audio-only call” during booking when data coverage is weak.</li>
              <li>Stay on the queue using the same slot; the doctor will phone the registered number.</li>
              <li>Submit the offline form so our coordinator can call back when the network stabilises.</li>
            </ul>
          </div>
          <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Request a call-back</h3>
            <p className="text-xs text-slate-500">
              We&apos;ll store your request securely and an operations member will call you to finish the booking.
            </p>
            <div className="mt-4">
              <OfflineRequestForm />
            </div>
          </div>
        </div>
      </section>
      )}

      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="mb-6 text-2xl font-semibold md:text-3xl">Featured doctors</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {featuredProviders.map((provider) => {
            const href = `/book/${encodeURIComponent(provider.slug || provider.id)}`;
            const languages = provider.languages.map(formatLanguage).join(", ");
            return (
              <div
                key={provider.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <Link
                    href={href}
                    className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    {provider.name.charAt(0)}
                  </Link>
                  <div>
                    <div className="font-medium text-gray-900">{provider.name}</div>
                    <div className="text-xs text-gray-500">{provider.speciality}</div>
                    {provider.qualification && (
                      <div className="text-xs text-gray-400">{provider.qualification}</div>
                    )}
                  </div>
                </div>
                {languages && <p className="mt-3 text-xs text-gray-500">Speaks: {languages}</p>}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={href}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Book online
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="mb-6 text-2xl font-semibold md:text-3xl">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { step: "1", title: "Search & compare", desc: "Filter by specialty, language, rating, and availability." },
            { step: "2", title: "Book & pay online", desc: "Confirm your slot, accept the consent, and pay securely." },
            { step: "3", title: "Join your visit", desc: "Get WhatsApp reminders and a video link before the visit." },
          ].map((x) => (
            <div key={x.step} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                {x.step}
              </div>
              <div className="text-lg font-medium text-gray-900">{x.title}</div>
              <p className="mt-1 text-sm text-gray-600">{x.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
