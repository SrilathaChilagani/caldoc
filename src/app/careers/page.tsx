export default function CareersPage() {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-10">
          <header className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Careers</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Join the CalDoc mission</h1>
            <p className="mt-3 text-sm text-slate-600">
              We are growing our engineering, operations, and clinical coordination teams. If you are passionate about
              telemedicine and want to improve access to quality care across India, share your profile below.
            </p>
          </header>

          <section className="rounded-3xl border border-slate-100 bg-[#f8fafc] p-6 shadow-inner">
            <h2 className="text-lg font-semibold text-slate-900">Current focus areas</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Full-stack engineers (Next.js, TypeScript, React Native)</li>
              <li>Provider onboarding specialists with NABH experience</li>
              <li>Pharmacy operations coordinators (telemedicine ready)</li>
              <li>Customer success managers for patient support</li>
            </ul>
          </section>

          <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Full name</label>
              <input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input type="email" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">LinkedIn or resume link</label>
              <input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Tell us about your experience</label>
              <textarea rows={4} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Short summary" />
            </div>
            <button type="button" className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Submit profile
            </button>
          </form>
      </div>
    </main>
  );
}
