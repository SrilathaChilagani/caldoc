import Image from "next/image";
import Link from "next/link";
import DisclaimerNotice from "@/components/DisclaimerNotice";
import OfflineRequestForm from "@/components/OfflineRequestForm";
import { prisma } from "@/lib/db";

const specialties = [
  { name: "Dermatology", slug: "dermatology", img: "/images/spec-derm.jpg" },
  { name: "Pediatrics", slug: "pediatrics", img: "/images/spec-peds.jpg" },
  { name: "Cardiology", slug: "cardiology", img: "/images/spec-card.jpg" },
  { name: "ENT", slug: "ent", img: "/images/spec-ent.jpg" },
  { name: "Orthopedics", slug: "orthopedics", img: "/images/spec-ortho.jpg" },
  { name: "Psychiatry", slug: "psychiatry", img: "/images/spec-psych.jpg" },
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

export default async function Home() {
  const topAppointments = await prisma.appointment.groupBy({
    by: ["providerId"],
    _count: { providerId: true },
    orderBy: { _count: { providerId: "desc" } },
    take: 3,
  });

  const topIds = topAppointments.map((t) => t.providerId);

  let featuredProviders = await prisma.provider.findMany({
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
    featuredProviders = await prisma.provider.findMany({
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
  } else {
    const order = new Map(topIds.map((id, idx) => [id, idx]));
    featuredProviders.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <DisclaimerNotice variant="banner" />
      <section
        className="relative overflow-hidden bg-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.68), rgba(255,255,255,0.85)), url(/images/Homepage.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative container mx-auto px-4 pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              TELEMEDICINE made simple
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Book teleconsultations with verified doctors, fast.
            </h1>
            <p className="text-lg text-gray-600">
              Search by specialty, doctor name, or registration number. Compare experience, see next available slots,
              and confirm in minutes with secure online payments.
            </p>

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
                Find a provider
              </button>
            </form>

            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span>✔ WhatsApp confirmations</span>
              <span>✔ UPI / cards</span>
              <span>✔ Instant video links</span>
            </div>
          </div>
        </div>
      </section>

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
              <li>Stay on the queue using the same slot; the provider will phone the registered number.</li>
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

      <section
        id="specialties"
        className="bg-white/95 backdrop-blur"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.9)), url(/images/Homepage.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
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
