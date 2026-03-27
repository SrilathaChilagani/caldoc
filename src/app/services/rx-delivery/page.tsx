import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import RxDeliveryForm from "./ui/RxDeliveryForm";
import RxDeliveryHeroSearch from "./ui/RxDeliveryHeroSearch";
import RxPopularMeds from "./ui/RxPopularMeds";
import { IMAGES } from "@/lib/imagePaths";

export const revalidate = 300;

const categories = [
  { name: "Pain Relief", slug: "pain-relief", icon: "💊" },
  { name: "Vitamins", slug: "vitamins", icon: "🧬" },
  { name: "Skin Care", slug: "skin-care", icon: "🧴" },
  { name: "Diabetes", slug: "diabetes", icon: "🩸" },
  { name: "Heart Health", slug: "heart-health", icon: "❤️" },
  { name: "Immunity", slug: "immunity", icon: "🛡️" },
  { name: "Digestive", slug: "digestive", icon: "🍽️" },
  { name: "Women's Health", slug: "womens-health", icon: "🌸" },
  { name: "Antibiotics", slug: "antibiotics", icon: "🦠" },
  { name: "Respiratory", slug: "respiratory", icon: "🫁" },
  { name: "Eye & Ear", slug: "eye-ear", icon: "👁️" },
  { name: "Men's Health", slug: "mens-health", icon: "💪" },
  { name: "Baby Care", slug: "baby-care", icon: "👶" },
  { name: "Bone & Joint", slug: "bone-joint", icon: "🦴" },
  { name: "Mental Health", slug: "mental-health", icon: "🧠" },
  { name: "Dental Care", slug: "dental-care", icon: "🦷" },
];

const features = [
  { title: "Free Delivery", desc: "On orders above ₹499", icon: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h11v8H3z" />
      <path d="M14 9h4l3 3v3h-7z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  ) },
  { title: "Same-Day Dispatch", desc: "Order before 2 PM", icon: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  ) },
  { title: "Genuine Medicines", desc: "100% authentic products", icon: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 4v5c0 4.5-3.2 8.2-7 9-3.8-.8-7-4.5-7-9V7l7-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ) },
  { title: "Prescription Upload", desc: "Easy Rx upload & refill", icon: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 3h6a4 4 0 0 1 0 8H9a4 4 0 0 1 0-8z" />
      <path d="M8 21h8a4 4 0 0 0 0-8H8a4 4 0 0 0 0 8z" />
    </svg>
  ) },
];

const popularMeds = [
  { name: "Dolo 650mg", category: "Pain Relief" },
  { name: "Crocin Advance", category: "Fever" },
  { name: "Combiflam Tab", category: "Pain Relief" },
  { name: "Ibuprofen 400mg", category: "Pain Relief" },
  { name: "Shelcal 500mg", category: "Calcium" },
  { name: "Becosules Capsules", category: "Vitamins" },
  { name: "Vitamin D3 60000 IU", category: "Vitamins" },
  { name: "B-Complex Plus", category: "Vitamins" },
  { name: "Pan-D Capsule", category: "Digestive" },
  { name: "Pantoprazole 40mg", category: "Digestive" },
  { name: "Cetirizine 10mg", category: "Allergy" },
  { name: "Allegra 180mg", category: "Allergy" },
  { name: "Metformin 500mg", category: "Diabetes" },
  { name: "Glimepiride 2mg", category: "Diabetes" },
  { name: "Amlodipine 5mg", category: "Heart Health" },
  { name: "Atorvastatin 10mg", category: "Cholesterol" },
  { name: "Folic Acid 5mg", category: "Women's Health" },
  { name: "Terbinafine 1% Cream", category: "Skin Care" },
];

type RxDeliveryPageProps = {
  searchParams?: { add?: string | string[] };
};

const getCachedMeds = unstable_cache(
  () =>
    prisma.medication.findMany({
      orderBy: { name: "asc" },
      take: 400,
      select: { name: true, category: true },
    }),
  ["rx-delivery-medications"],
  { revalidate: 300 }
);

export default async function RxDeliveryPage({ searchParams }: RxDeliveryPageProps) {
  const addParam = searchParams?.add;
  const initialItemName = Array.isArray(addParam) ? addParam[0] : addParam;
  const meds = await getCachedMeds();
  const options = meds.map((m) => ({ name: m.name, category: m.category }));

  return (
    <main className="bg-[#f7f2ea] text-slate-900">
      <section className="relative min-h-[110vh] -mt-16">
        <div className="absolute inset-0">
          <Image
            src={IMAGES.HERO_PHARMACY}
            alt="Pharmacy shelves"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2ea]/80 via-[#f7f2ea]/40 to-transparent" />
        </div>

        <div className="container relative mx-auto px-6 lg:px-12 pt-32 pb-32">
          <div className="max-w-2xl">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-tight mb-4">
              Your medicines,
              <br />
              <span className="text-[#2f6ea5]">delivered fast.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg mb-10 leading-relaxed">
              Search by medicine name or upload your prescription for instant ordering.
            </p>

            <RxDeliveryHeroSearch />

            <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6ea5]" />
                Free delivery above ₹499
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6ea5]" />
                Genuine medicines
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6ea5]" />
                Easy returns
              </span>
            </div>

            <a
              href="#categories"
              className="hidden lg:inline-flex items-center gap-2 text-slate-600 hover:text-[#2f6ea5] transition-colors cursor-pointer mt-10"
            >
              Browse Categories
              <span className="inline-flex h-5 w-5 items-center justify-center motion-safe:animate-bounce">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-transparent">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e7edf3] flex items-center justify-center shrink-0 text-[#2f6ea5]">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="py-20 lg:py-28">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl text-slate-900 mb-3">Shop by Category</h2>
            <p className="text-slate-600 max-w-md mx-auto">Find what you need, fast</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/services/rx-delivery/search?category=${encodeURIComponent(cat.slug)}`}
                className="rounded-2xl border border-white/40 bg-white/70 p-5 text-center hover:shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] transition-all duration-300"
              >
                <span
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-2xl leading-none shadow-sm"
                  style={{ fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji" }}
                >
                  {cat.icon}
                </span>
                <span className="text-sm font-medium text-slate-900">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-transparent">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl text-slate-900 mb-3">Popular Medicines</h2>
            <p className="text-slate-600 max-w-md mx-auto">Frequently ordered by our customers</p>
          </div>
          <RxPopularMeds meds={popularMeds} />
        </div>
      </section>

      <section id="order" className="bg-[#f7f2ea] py-20">
        <div className="mx-auto max-w-5xl space-y-8 px-6">
          <div className="text-center">
            <h2 className="font-serif text-3xl text-slate-900">Place your order</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add your medicines and delivery details. We'll confirm availability before payment.
            </p>
          </div>
          {/* Prescription compliance notice — Drugs and Cosmetics Act 1940 / TPG 2020 */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-semibold">Prescription &amp; Drug Schedule Notice</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
              <li><strong>OTC medicines</strong> can be ordered without a prescription.</li>
              <li><strong>Schedule H &amp; H1 drugs</strong> require a valid prescription. Please upload your prescription during checkout.</li>
              <li><strong>Schedule X drugs</strong> (narcotic/psychotropic controlled substances) <em>cannot be dispensed online</em> under any circumstances — as per the Drugs and Cosmetics Act, 1940, and the Telemedicine Practice Guidelines 2020.</li>
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              We only dispense medicines through licensed partner pharmacies. Prescription verification is mandatory for scheduled drugs.{" "}
              <a href="/compliance" className="font-semibold underline">View compliance details</a>.
            </p>
          </div>
          <div>
            <RxDeliveryForm options={options} initialItemName={initialItemName} />
          </div>
        </div>
      </section>
    </main>
  );
}
