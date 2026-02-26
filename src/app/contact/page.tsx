"use client";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to send");
      }
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setStatus("error");
    }
  }

  return (
    <main className="bg-[#f8fafc] py-16">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Contact us</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">We&apos;d love to hear from you</h1>
          <p className="mt-3 text-sm text-slate-600">
            Share your details and our team will get in touch within one business day. For urgent clinical queries, please
            reach out through your patient portal.
          </p>
        </header>

        {status === "sent" ? (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-emerald-800">Message sent!</p>
            <p className="mt-1 text-sm text-emerald-700">Our team will get back to you within one business day.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="text-sm font-semibold text-slate-700">Full name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Message *</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
                placeholder="How can we help?"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-full bg-[#2f6ea5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#255a8a] disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
