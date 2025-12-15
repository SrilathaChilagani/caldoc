export default function AboutPage() {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6 lg:px-10">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">About CalDoc</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Telemedicine, simplified for India</h1>
          <p className="mt-4 text-sm text-slate-600">
            CalDoc was founded in 2022 to make specialist care available to every district in India. Our goal is to remove
            the friction around scheduling, video visits, consent, and prescription delivery so that doctors can focus on
            clinical decisions and patients can focus on getting better.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            We partner with NABH-accredited hospitals, independent specialists, and licensed pharmacies. Every workflow
            is built on top of verified provider identities, secure payment capture, and automated WhatsApp updates so
            no one misses a step.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-[#f7f9fc] p-6 shadow-inner">
          <h2 className="text-xl font-semibold text-slate-900">What we believe</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Telemedicine should feel as reliable as an in-person visit.</li>
            <li>Patients deserve transparent pricing, reminders, and post-visit summaries.</li>
            <li>Doctors need integrated workflows for consent, documents, and pharmacy dispatch.</li>
            <li>Pharmacies require clear, auditable instructions before delivering medicine.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
