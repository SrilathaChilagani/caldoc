import Image from "next/image";
import LabHomeForm from "./ui/LabHomeForm";
import { IMAGES } from "@/lib/imagePaths";
import { LAB_TEST_OPTIONS } from "@/lib/labTests";
import LabsHeroSearch from "./ui/LabsHeroSearch";

const categories = [
  { name: "Blood Tests", icon: "🩸" },
  { name: "Imaging", icon: "📸" },
  { name: "Pathology", icon: "🔬" },
  { name: "Ultrasound", icon: "📡" },
  { name: "ECG", icon: "❤️" },
  { name: "X-Ray", icon: "☢️" },
  { name: "Allergy Tests", icon: "🌡️" },
  { name: "COVID-19", icon: "🦠" },
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
  { name: "Complete Blood Count", category: "Blood Tests", price: "₹299", discount: "20% off" },
  { name: "Lipid Profile", category: "Blood Tests", price: "₹399", discount: "15% off" },
  { name: "Thyroid Panel", category: "Blood Tests", price: "₹599", discount: "18% off" },
  { name: "COVID-19 RT-PCR", category: "COVID-19", price: "₹499", discount: "10% off" },
  { name: "Liver Function Test", category: "Blood Tests", price: "₹349", discount: "15% off" },
  { name: "Kidney Function Test", category: "Blood Tests", price: "₹349", discount: "15% off" },
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

            <div className="flex gap-3 mt-6">
              <a
                href="#order"
                className="inline-flex items-center gap-2 rounded-xl h-11 px-8 border border-[#e7e0d5] bg-white/70 hover:bg-white font-medium"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <rect x="4" y="16" width="16" height="4" rx="2" />
                </svg>
                Upload Prescription
              </a>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.name}
                className="rounded-2xl border border-white/40 bg-white/70 p-5 text-center hover:shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] transition-all duration-300"
              >
                <span className="text-3xl mb-2 block">{cat.icon}</span>
                <span className="text-sm font-medium text-slate-900">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white/70">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl text-slate-900 mb-3">Popular Tests</h2>
            <p className="text-slate-600 max-w-md mx-auto">Most frequently booked by our customers</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {popularTests.map((test) => (
              <div
                key={test.name}
                className="rounded-2xl border border-white/40 bg-white/70 p-5 flex items-center justify-between hover:shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] transition-all duration-300"
              >
                <div>
                  <h3 className="font-medium text-slate-900">{test.name}</h3>
                  <p className="text-xs text-slate-600">{test.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-slate-900">{test.price}</span>
                    <span className="text-xs text-[#2f6ea5] font-medium">{test.discount}</span>
                  </div>
                </div>
                <button className="rounded-xl bg-[#2f6ea5] hover:bg-[#255b8b] text-white text-sm px-4 py-2">
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-[#2f6ea5] text-white">
        <div className="container mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-serif text-3xl lg:text-4xl mb-4">Have a Doctor's Prescription?</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-8">
            Upload your prescription and we'll arrange a free home collection and testing.
          </p>
          <a
            href="#order"
            className="inline-flex items-center gap-2 rounded-xl h-12 px-10 border border-white/30 text-white bg-white/10 hover:bg-white/20 font-medium"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <rect x="4" y="16" width="16" height="4" rx="2" />
            </svg>
            Upload Prescription
          </a>
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
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
            <LabHomeForm options={LAB_TEST_OPTIONS} />
          </div>
        </div>
      </section>
    </main>
  );
}
