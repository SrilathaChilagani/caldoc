import Image from "next/image";
import Link from "next/link";
import DisclaimerNotice from "@/components/DisclaimerNotice";
import OfflineRequestForm from "@/components/OfflineRequestForm";
import { prisma } from "@/lib/db";
import { IMAGES, HERO_DOCTOR_IMAGES, getDailyHeroImage } from "@/lib/imagePaths";

export const revalidate = 3600;

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
  {
    id: "fallback-4",
    slug: "heart-care",
    name: "Dr. Heart Care",
    speciality: "Cardiology",
    qualification: "MBBS, DM",
    languages: ["en", "hi"],
  },
];

export default async function Home() {
  const heroBackground = getDailyHeroImage(HERO_DOCTOR_IMAGES);

  let featuredProviders: ProviderCard[] = FALLBACK_PROVIDERS;

  try {
    const topAppointments = await prisma.appointment.groupBy({
      by: ["providerId"],
      _count: { providerId: true },
      orderBy: { _count: { providerId: "desc" } },
      take: 4,
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

    if (featuredProviders.length < 4) {
      const fillers = await prisma.provider.findMany({
        orderBy: { name: "asc" },
        take: 4,
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
        className="relative -mt-16 flex min-h-screen items-center overflow-hidden bg-[#f7f2ea]"
      >
        <div className="absolute inset-0">
          <Image
            src={heroBackground}
            alt="Doctor consultation"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2ea]/90 via-[#f7f2ea]/50 to-transparent" />
        </div>

        <div className="relative container mx-auto px-6 lg:px-12">
          <div className="max-w-2xl pt-16">
            <h1 className="font-serif font-normal leading-tight tracking-tight text-slate-900" style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}>
              Book your
              <br />
              <span className="text-[#2f6ea5]">teleconsultations</span>
              <br />
              today.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Search by specialty, doctor name, or diagnosis to find the right care.
            </p>

            <form
              action="/providers"
              method="GET"
              className="mt-10 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-white/60 bg-white/70 p-2 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] backdrop-blur-xl sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <svg
                  viewBox="0 0 24 24"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  name="q"
                  placeholder="Search doctors, specialties, symptoms…"
                  className="h-12 w-full rounded-xl border-0 bg-white/60 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#2f6ea5]/30"
                />
              </div>
              <input
                name="specialty"
                placeholder="Specialty (optional)"
                className="h-12 w-full rounded-xl border-0 bg-white/60 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#2f6ea5]/30 sm:max-w-[180px]"
              />
              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#2f6ea5] px-6 text-sm font-semibold text-white hover:bg-[#255b8b] sm:w-auto"
              >
                Find a doctor
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2f6ea5]" />
                WhatsApp confirmations
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2f6ea5]" />
                UPI / cards
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2f6ea5]" />
                Instant video links
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/services/rx-delivery"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/60 bg-white/70 px-8 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
              >
                Pharmacy
              </Link>
              <Link
                href="/services/labs-at-home"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/60 bg-white/70 px-8 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
              >
                Labs
              </Link>
            </div>

            <a
              href="#specialties"
              className="mt-10 hidden items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#2f6ea5] lg:inline-flex"
            >
              Discover More
              <span className="inline-flex h-5 w-5 items-center justify-center motion-safe:animate-bounce">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 lg:hidden">
          <div className="flex flex-col items-center text-slate-600">
            <span className="text-sm mb-2">Discover More</span>
            <span className="inline-flex h-5 w-5 items-center justify-center motion-safe:animate-bounce">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>
      </section>

      <section id="specialties" className="bg-[#f7f2ea]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Browse by specialty</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-slate-900 md:text-4xl">Find the right care team</h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose a specialty to explore doctors that match your needs.
            </p>
            <Link
              href="/providers"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2f6ea5] hover:gap-3"
            >
              See all doctors →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {specialties.map((s) => (
              <Link
                key={s.slug}
                href={`/providers?specialty=${encodeURIComponent(s.slug)}`}
                className="group rounded-3xl border border-white/70 bg-white/85 p-3 shadow-[0_20px_50px_-18px_rgba(88,110,132,0.2)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-20px_rgba(88,110,132,0.28)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                  <Image
                    src={s.img}
                    alt={s.name}
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="(min-width: 768px) 160px, 45vw"
                  />
                </div>
                <div className="mt-3 text-center text-sm font-medium text-slate-800">{s.name}</div>
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

      <section id="doctors" className="bg-[#f7f2ea]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold text-slate-900 md:text-4xl">Meet Our Doctors</h2>
            <p className="mt-2 text-sm text-slate-600">
              Expert healthcare professionals dedicated to your wellbeing
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {featuredProviders.map((provider, index) => {
              const href = `/book/${encodeURIComponent(provider.slug || provider.id)}`;
              const languages = provider.languages.map(formatLanguage).join(", ");
              const initials = provider.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase();
              const gradients = [
                "from-[#2f6ea5] to-[#5fa1d3]",
                "from-[#d8895b] to-[#f0b38a]",
                "from-[#7c6bd6] to-[#b08cff]",
                "from-[#e07aa1] to-[#f4a1bf]",
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <div
                  key={provider.id}
                  className="group rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_70px_-18px_rgba(88,110,132,0.28)]"
                >
                  <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient}`}>
                    <span className="font-serif text-3xl font-semibold text-white">{initials}</span>
                  </div>
                  <div className="text-center">
                    <h3 className="font-serif text-xl font-semibold text-slate-900">{provider.name}</h3>
                    <p className="text-sm font-medium text-[#2f6ea5]">{provider.speciality}</p>
                    {provider.qualification && (
                      <p className="text-xs text-slate-500">{provider.qualification}</p>
                    )}
                    {languages && (
                      <p className="mt-3 text-xs text-slate-500">Speaks: {languages}</p>
                    )}
                    <Link
                      href={href}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#2f6ea5]/10 px-4 py-2 text-sm font-semibold text-[#2f6ea5] transition hover:bg-[#2f6ea5] hover:text-white"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/providers"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f6ea5] hover:gap-3"
            >
              View all doctors →
            </Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#f7f2ea]">
        <div className="container mx-auto grid gap-12 px-4 py-12 md:grid-cols-2 md:gap-16 md:py-16">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-900 md:text-4xl">
              Your journey to better health, <span className="text-[#2f6ea5]">simplified.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              From booking to follow-up, we&apos;ve designed every step to be seamless and stress-free. Here&apos;s how it
              works.
            </p>
          </div>
          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Search & Compare",
                desc: "Filter by specialty, language, rating, and availability to find your perfect match.",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Book & Pay",
                desc: "Confirm your slot, accept the consent, and pay securely via UPI or cards.",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M7 3v4M17 3v4M3 11h18" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Join Your Visit",
                desc: "Get WhatsApp reminders and a video link before your consultation.",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="7" width="13" height="10" rx="2" />
                    <path d="M16 10l5-3v10l-5-3" />
                  </svg>
                ),
              },
              {
                step: "04",
                title: "Follow Up",
                desc: "Receive prescriptions, book follow-ups, and access your health records.",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                ),
              },
            ].map((x) => (
              <div key={x.step} className="flex items-start gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#2f6ea5] shadow-[0_15px_40px_-18px_rgba(88,110,132,0.35)]">
                  {x.icon}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold tracking-[0.2em] text-[#2f6ea5]/70">{x.step}</span>
                    <h3 className="font-serif text-xl font-semibold text-slate-900">{x.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{x.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-[#f7f2ea]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold text-slate-900 md:text-4xl">What Our Patients Say</h2>
            <p className="mt-2 text-sm text-slate-600">Real stories from people who found care with CalDoc</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Priya Nair",
                location: "Mumbai",
                text: "CalDoc made it so easy to consult a dermatologist from home. The doctor was incredibly thorough and my skin has never looked better!",
                avatar: "PN",
              },
              {
                name: "Rahul Krishnan",
                location: "Bangalore",
                text: "As a busy professional, I don't have time for clinic visits. CalDoc's video consultations are a game-changer. Highly recommended!",
                avatar: "RK",
              },
              {
                name: "Anjali Sharma",
                location: "Delhi",
                text: "The pediatrician on CalDoc helped us at 2 AM when our baby had a fever. The peace of mind is priceless.",
                avatar: "AS",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="relative rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_50px_-18px_rgba(88,110,132,0.2)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-20px_rgba(88,110,132,0.28)]"
              >
                <div className="absolute right-6 top-6 text-[#2f6ea5]/10">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M7.2 6.5c-2.3 1.5-3.7 3.7-3.7 6.4 0 2.5 1.5 4.4 3.7 4.4 1.8 0 3.2-1.3 3.2-3.1 0-1.7-1.1-2.8-2.6-3 0.4-1.4 1.3-2.5 2.7-3.4l-1.3-1.3zm9 0c-2.3 1.5-3.7 3.7-3.7 6.4 0 2.5 1.5 4.4 3.7 4.4 1.8 0 3.2-1.3 3.2-3.1 0-1.7-1.1-2.8-2.6-3 0.4-1.4 1.3-2.5 2.7-3.4l-1.3-1.3z" />
                  </svg>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <svg
                      key={idx}
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-amber-400"
                      fill="currentColor"
                    >
                      <path d="M12 17.3l-5.1 3 1.4-5.8L3 9.8l5.9-.5L12 4l3.1 5.3 5.9.5-5.3 4.7 1.4 5.8z" />
                    </svg>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  &quot;{testimonial.text}&quot;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f6ea5]/10 text-sm font-semibold text-[#2f6ea5]">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{testimonial.name}</div>
                    <div className="text-xs text-slate-500">{testimonial.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
