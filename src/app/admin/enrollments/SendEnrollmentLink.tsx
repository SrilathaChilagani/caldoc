"use client";
import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
const LINKS: Record<string, string> = {
  doctor: `${BASE}/enroll`,
  pharmacy: `${BASE}/enroll/pharmacy`,
  lab: `${BASE}/enroll/labs`,
};

export default function SendEnrollmentLink() {
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"doctor" | "pharmacy" | "lab">("doctor");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    if (!phone.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/send-enrollment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), type }),
      });
      const d = await res.json();
      setResult(d.ok ? { ok: true } : { error: d.error || "Failed to send" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(LINKS[type]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
      <h2 className="mb-1 font-semibold text-slate-900">Send Enrollment Link</h2>
      <p className="mb-4 text-xs text-slate-500">Send an enrollment invitation via WhatsApp</p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Mobile number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Enrollment type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "doctor" | "pharmacy" | "lab")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none"
          >
            <option value="doctor">Doctor</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="lab">Diagnostic Lab</option>
          </select>
        </div>
        <button
          onClick={send}
          disabled={busy || !phone.trim()}
          className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send via WhatsApp"}
        </button>
      </div>

      {/* Copy link */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-slate-500">Or copy link:</span>
        <span className="flex-1 truncate rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600">
          {LINKS[type]}
        </span>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {result?.ok && (
        <p className="mt-3 text-sm text-emerald-600">WhatsApp message sent successfully!</p>
      )}
      {result?.error && (
        <p className="mt-3 text-sm text-rose-600">Error: {result.error}</p>
      )}
    </div>
  );
}
