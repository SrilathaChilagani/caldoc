"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  options: string[];
  initialItems?: { name: string; qty: number }[];
  showTestsSection?: boolean;
};

type TestItem = { id: string; name: string; qty: number };

const EMPTY_TEST = (): TestItem => ({ id: crypto.randomUUID(), name: "", qty: 1 });

export default function LabHomeForm({ options, initialItems, showTestsSection = true }: Props) {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        qty: Math.max(1, Number(item.qty) || 1),
      }));
    }
    return [EMPTY_TEST()];
  });
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

  function updateQty(id: string, qty: number) {
    setTests((prev) => prev.map((test) => (test.id === id ? { ...test, qty } : test)));
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
          .map((test) => ({ name: test.name.trim(), qty: Math.max(1, Number(test.qty) || 1) }))
          .filter((test) => Boolean(test.name))
          .reduce<{ name: string; qty: number }[]>((acc, item) => {
            const existing = acc.find((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
            if (existing) {
              existing.qty += item.qty;
              return acc;
            }
            acc.push({ ...item });
            return acc;
          }, []),
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
      {showTestsSection && (
        <div>
          <h2 className="font-serif text-lg text-slate-900">Tests</h2>
          <p className="text-sm text-slate-500">Search for a test or enter the exact panel requested by your doctor.</p>
          <div className="mt-4 space-y-4">
            {tests.map((test) => (
              <div key={test.id} className="flex flex-col gap-3 rounded-2xl border border-[#e7e0d5] bg-white/70 p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test name</label>
                  <input
                    list="lab-test-options"
                    value={test.name}
                    onChange={(e) => updateTest(test.id, e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                    placeholder="Start typing to search"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={test.qty}
                    onChange={(e) => updateQty(test.id, Number(e.target.value))}
                    className="mt-1 w-24 rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
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
              className="rounded-full border border-dashed border-[#2f6ea5]/40 px-4 py-2 text-xs font-semibold text-[#2f6ea5]"
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
      )}

      <div>
        <h2 className="font-serif text-lg text-slate-900">Patient contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Full name
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
            />
          </label>
          <label className="text-sm text-slate-700">
            Mobile number
            <input
              type="tel"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              required
              title="Enter your phone number with country code (e.g. +91 for India, +1 for US)"
              placeholder="+91 98765 43210 or +1 555 123 4567"
              maxLength={20}
              className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
            />
          </label>
          <label className="text-sm text-slate-700">
            Email (optional)
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="font-serif text-lg text-slate-900">Sample collection address</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-sm text-slate-700">
            Address line 1
            <input
              type="text"
              value={address.line1}
              onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
              required
              className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
            />
          </label>
          <label className="text-sm text-slate-700">
            Address line 2
            <input
              type="text"
              value={address.line2}
              onChange={(e) => setAddress((prev) => ({ ...prev, line2: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
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
                className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
              />
            </label>
            <label className="text-sm text-slate-700">
              State
              <input
                type="text"
                value={address.state}
                onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
              />
            </label>
            <label className="text-sm text-slate-700">
              Postal code
              <input
                type="text"
                value={address.postalCode}
                onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                required
                pattern="[0-9]{6}"
                title="Enter a valid 6-digit Indian PIN code"
                placeholder="400001"
                maxLength={6}
                className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
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
          className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          placeholder="Mention fasting requirements or collection preferences"
        />
      </label>

      {message && <p className="text-sm text-rose-600">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-[#2f6ea5] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#255b8b] disabled:opacity-50"
      >
        {saving ? "Processing…" : "Continue to payment"}
      </button>
    </form>
  );
}
