const steps = [
  {
    title: "Search & compare",
    detail: "Filter doctors by specialty, experience, gender, languages, or availability. Each profile shows next open slot.",
  },
  {
    title: "Book securely",
    detail: "Pick a slot, add patient details, share notes for the doctor, and pay via Razorpay or request phone delivery.",
  },
  {
    title: "Get reminders",
    detail: "We send WhatsApp updates with the video link, consent reminders, and prescription upload notifications.",
  },
  {
    title: "Join the visit",
    detail: "Video rooms open directly in your browser via Daily. Low-bandwidth callers can switch to audio with one tap.",
  },
  {
    title: "Review follow-ups",
    detail: "Prescriptions, visit notes, and pharmacy delivery updates appear in the patient portal for easy access.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="bg-gradient-to-b from-[#eef4ff] via-white to-white py-16">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-blue-50 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">How it works</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Five simple steps to CalDoc care</h1>
          <p className="mt-3 text-sm text-slate-600">
            Every action is documented and synced via WhatsApp, so patients, doctors, and pharmacy teams stay aligned.
          </p>
        </header>

        <ol className="space-y-4">
          {steps.map((step, idx) => (
            <li key={step.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-semibold text-white">
                  {idx + 1}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{step.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
