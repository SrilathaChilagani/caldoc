import Image from "next/image";
import Link from "next/link";
import LabHomeForm from "./ui/LabHomeForm";
import { IMAGES } from "@/lib/imagePaths";
import { LAB_TEST_OPTIONS } from "@/lib/labTests";
import LabsHeroSearch from "./ui/LabsHeroSearch";
import LabsPopularTests from "./ui/LabsPopularTests";

const categories = [
  { name: "Blood Tests", slug: "blood-tests", icon: "🩸" },
  { name: "Imaging", slug: "imaging", icon: "📸" },
  { name: "Pathology", slug: "pathology", icon: "🔬" },
  { name: "Ultrasound", slug: "ultrasound", icon: "📡" },
  { name: "ECG", slug: "ecg", icon: "❤️" },
  { name: "X-Ray", slug: "x-ray", icon: "☢️" },
  { name: "Allergy Tests", slug: "allergy", icon: "🌡️" },
  { name: "COVID-19", slug: "covid-19", icon: "🦠" },
  { name: "Hormonal Tests", slug: "hormonal", icon: "💉" },
  { name: "Fertility Tests", slug: "fertility", icon: "🌱" },
  { name: "Nutrition Panel", slug: "nutrition", icon: "🥗" },
  { name: "Bone Health", slug: "bone-health", icon: "🦴" },
  { name: "Cancer Markers", slug: "cancer-markers", icon: "🧬" },
  { name: "Diabetes Panel", slug: "diabetes-panel", icon: "📊" },
  { name: "Cardiac Markers", slug: "cardiac-markers", icon: "🫀" },
  { name: "Urine Tests", slug: "urine-tests", icon: "🧪" },
];

const features = [
  {
    title: "Home Collection",
    desc: "Free sample collection at home",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7h11v8H3z" />
        <path d="M14 9h4l3 3v3h-7z" />
        <circle cx="7.5" cy="18" r="1.5" />
        <circle cx="17.5" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    title: "Same-Day Results",
    desc: "Quick turnaround time",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Certified Labs",
    desc: "NABL certified facilities",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7 4v5c0 4.5-3.2 8.2-7 9-3.8-.8-7-4.5-7-9V7l7-4z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Advanced Testing",
    desc: "Latest diagnostic technology",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 3h6a4 4 0 0 1 0 8H9a4 4 0 0 1 0-8z" />
        <path d="M8 21h8a4 4 0 0 0 0-8H8a4 4 0 0 0 0 8z" />
      </svg>
    ),
  },
];

const popularTests = [
  { name: "Complete Blood Count", category: "Blood Tests" },
  { name: "Lipid Profile", category: "Blood Tests" },
  { name: "Thyroid Panel (T3/T4/TSH)", category: "Hormonal Tests" },
  { name: "HbA1c", category: "Diabetes Panel" },
  { name: "Blood Sugar Fasting", category: "Diabetes Panel" },
  { name: "Liver Function Test", category: "Blood Tests" },
  { name: "Kidney Function Test", category: "Blood Tests" },
  { name: "Vitamin D3", category: "Nutrition Panel" },
  { name: "Vitamin B12", category: "Nutrition Panel" },
  { name: "Iron Studies", category: "Blood Tests" },
  { name: "Urine Routine & Microscopy", category: "Urine Tests" },
  { name: "Dengue NS1 Antigen", category: "Blood Tests" },
  { name: "COVID-19 RT-PCR", category: "COVID-19" },
  { name: "ECG (12-Lead)", category: "ECG" },
  { name: "Chest X-Ray", category: "X-Ray" },
  { name: "CRP (C-Reactive Protein)", category: "Blood Tests" },
  { name: "Beta HCG (Pregnancy)", category: "Hormonal Tests" },
  { name: "PSA (Prostate Specific Antigen)", category: "Cancer Markers" },
];

export const metadata = {
  title: "Labs at home | CalDoc",
};

export default function LabsAtHomePage() {
  return (
    <main className="bg-[#f7f2ea] text-slate-900">
      <section className="relative -mt-16 min-h-[110vh]">
        <div className="absolute inset-0">
          <Image
            src={IMAGES.HERO_LABS}
            alt="Laboratory equipment"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2ea]/80 via-[#f7f2ea]/40 to-transparent" />
        </div>

        <div className="container relative mx-auto px-6 lg:px-12 py-32">
          <div className="max-w-2xl">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-tight mb-4">
              Get tested,
              <br />
              <span className="text-[#2f6ea5]">stay healthy.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg mb-10 leading-relaxed">
              Search by test name or upload your doctor's prescription for comprehensive diagnostics.
            </p>

            <LabsHeroSearch />

            <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6ea5]" />
                Home sample collection
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6ea5]" />
                Certified labs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6ea5]" />
                Same-day reports
              </span>
            </div>

            <a
              href="#categories"
              className="hidden lg:inline-flex items-center gap-2 text-slate-600 hover:text-[#2f6ea5] transition-colors cursor-pointer mt-10"
            >
              Browse Tests
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
            <h2 className="font-serif text-3xl lg:text-4xl text-slate-900 mb-3">Browse by Test Type</h2>
            <p className="text-slate-600 max-w-md mx-auto">Find the test you need</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/services/labs-at-home/search?category=${encodeURIComponent(cat.slug)}`}
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
            <h2 className="font-serif text-3xl lg:text-4xl text-slate-900 mb-3">Popular Tests</h2>
            <p className="text-slate-600 max-w-md mx-auto">Most frequently booked by our customers</p>
          </div>
          <LabsPopularTests tests={popularTests} />
        </div>
      </section>

      <section id="order" className="bg-[#f7f2ea] py-20">
        <div className="mx-auto max-w-5xl space-y-8 px-6">
          <div className="text-center">
            <h2 className="font-serif text-3xl text-slate-900">Book doorstep sample collection</h2>
            <p className="mt-2 text-sm text-slate-600">
              Select the tests you need, share your contact details, and pay securely.
            </p>
          </div>
          {/* Lab compliance notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-semibold">Lab Order Notice</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
              <li>Certain diagnostic tests (e.g., specialised pathology, controlled-substance screening) require a doctor&apos;s prescription or referral letter. Please upload your doctor&apos;s request form where indicated.</li>
              <li>All sample collections are performed by trained phlebotomists from <strong>NABL-accredited partner laboratories</strong>.</li>
              <li>Results are confidential and shared only with you and your treating physician.</li>
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              Lab services comply with the Clinical Establishments (Registration and Regulation) Act, 2010, and NABL accreditation standards.{" "}
              <a href="/compliance" className="font-semibold underline">View compliance details</a>.
            </p>
          </div>
          <div>
            <LabHomeForm options={LAB_TEST_OPTIONS} />
          </div>
        </div>
      </section>
    </main>
  );
}
