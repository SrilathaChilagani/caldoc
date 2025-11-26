"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export default function OfflineRequestForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/offline-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, speciality, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Unable to submit request");
      }
      setMessage("Request received! Our coordinator will call you when the network improves.");
      setName("");
      setPhone("");
      setSpeciality("");
      setNotes("");
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Mobile number"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <input
        value={speciality}
        onChange={(e) => setSpeciality(e.target.value)}
        placeholder="Speciality needed"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Tell us about your concern"
        rows={3}
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
      />
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {busy ? "Sending..." : "Submit offline request"}
      </button>
    </form>
  );
}
