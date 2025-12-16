"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  options: string[];
};

type TestItem = { id: string; name: string };

const EMPTY_TEST = (): TestItem => ({ id: crypto.randomUUID(), name: "" });

export default function LabHomeForm({ options }: Props) {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([EMPTY_TEST()]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "", postalCode: "" });
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const lookupOptions = useMemo(() => options.slice().sort(), [options]);

  function updateTest(id: string, name: string) {
    setTests((prev) => prev.map((test) => (test.id === id ? { ...test, name } : test)));
  }

  function removeTest(id: string) {
    setTests((prev) => (prev.length === 1 ? prev : prev.filter((test) => test.id !== id)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        patientName,
        patientPhone,
        patientEmail,
        address,
        instructions,
        tests: tests
          .map((test) => test.name.trim())
          .filter((name) => Boolean(name))
          .filter((name, idx, arr) => arr.indexOf(name) === idx),
      };
      if (!payload.tests.length) {
        throw new Error("Select at least one lab test");
      }
      const res = await fetch("/api/services/labs-at-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to create lab order");
      }
      router.push(`/services/labs-at-home/pay?order=${data.orderId}`);
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tests</h2>
        <p className="text-sm text-slate-500">Search for a test or enter the exact panel requested by your doctor.</p>
        <div className="mt-4 space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test name</label>
                <input
                  list="lab-test-options"
                  value={test.name}
                  onChange={(e) => updateTest(test.id, e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
                  placeholder="Start typing to search"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeTest(test.id)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                disabled={tests.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTests((prev) => [...prev, EMPTY_TEST()])}
            className="rounded-full border border-dashed border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700"
          >
            + Add another test
          </button>
          <datalist id="lab-test-options">
            {lookupOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Patient contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Full name
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-700">
            Mobile number
            <input
              type="tel"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-700">
            Email (optional)
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sample collection address</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-sm text-slate-700">
            Address line 1
            <input
              type="text"
              value={address.line1}
              onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-700">
            Address line 2
            <input
              type="text"
              value={address.line2}
              onChange={(e) => setAddress((prev) => ({ ...prev, line2: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              City
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-700">
              State
              <input
                type="text"
                value={address.state}
                onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-700">
              Postal code
              <input
                type="text"
                value={address.postalCode}
                onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      <label className="block text-sm text-slate-700">
        Notes for labs team (optional)
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
          placeholder="Mention fasting requirements or collection preferences"
        />
      </label>

      {message && <p className="text-sm text-rose-600">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Processing…" : "Continue to payment"}
      </button>
    </form>
  );
}
