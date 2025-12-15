export default function ContactPage() {
  return (
    <main className="bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <header className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Contact us</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">We’d love to hear from you</h1>
          <p className="mt-3 text-sm text-slate-600">
            Share your details and our team will get in touch within one business day. For urgent clinical queries, please
            reach out through your patient portal.
          </p>
        </header>

        <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Full name</label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Phone</label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Message</label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              placeholder="How can we help?"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Submit
          </button>
        </form>
      </div>
    </main>
  );
}
