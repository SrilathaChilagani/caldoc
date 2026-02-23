"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

type Item = { id: string; name: string; qty: number };

type MedicationOption = {
  name: string;
  category?: string | null;
};

type PrescriptionUpload = {
  key: string;
  fileName: string;
  contentType: string;
  size: number;
};

type Props = {
  options: MedicationOption[];
  initialItemName?: string;
  initialItems?: { name: string; qty: number }[];
  onItemsChange?: (items: Item[]) => void;
  showItemsSection?: boolean;
};

const EMPTY_ITEM = (): Item => ({ id: crypto.randomUUID(), name: "", qty: 1 });

export default function RxDeliveryForm({
  options,
  initialItemName,
  initialItems,
  onItemsChange,
  showItemsSection = true,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        qty: Math.max(1, Number(item.qty) || 1),
      }));
    }
    const trimmed = initialItemName?.trim();
    if (trimmed) {
      return [{ id: crypto.randomUUID(), name: trimmed, qty: 1 }];
    }
    return [EMPTY_ITEM()];
  });
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "", postalCode: "" });
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openSuggestionFor, setOpenSuggestionFor] = useState<string | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionUpload, setPrescriptionUpload] = useState<PrescriptionUpload | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  useEffect(() => {
    onItemsChange?.(items);
  }, [items]);

  const lookupOptions = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name)),
    [options],
  );

  const optionMap = useMemo(() => {
    const map = new Map<string, MedicationOption>();
    for (const option of options) {
      map.set(option.name.toLowerCase(), option);
    }
    return map;
  }, [options]);

  const rxRequired = useMemo(() => {
    return items.some((item) => {
      const match = optionMap.get(item.name.trim().toLowerCase());
      return match?.category && match.category !== "OTC";
    });
  }, [items, optionMap]);

  async function uploadPrescription(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/services/rx-delivery/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Unable to upload prescription");
    }
    return data as PrescriptionUpload;
  }

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setPrescriptionError(null);
    try {
      let upload = prescriptionUpload;
      if (rxRequired) {
        if (!prescriptionFile && !upload) {
          setPrescriptionError("Prescription is required for Rx-only medicines.");
          setSaving(false);
          return;
        }
        if (!upload && prescriptionFile) {
          setUploading(true);
          upload = await uploadPrescription(prescriptionFile);
          setPrescriptionUpload(upload);
          setUploading(false);
        }
      }
      const payload = {
        patientName,
        patientPhone,
        patientEmail,
        address,
        instructions,
        prescription: upload,
        items: items
          .map((item) => ({ name: item.name.trim(), qty: item.qty }))
          .filter((item) => item.name && item.qty > 0),
      };
      const res = await fetch("/api/services/rx-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to create order");
      }
      router.push(`/services/rx-delivery/pay?order=${data.orderId}`);
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showItemsSection && (
        <div>
          <h2 className="font-serif text-lg text-slate-900">Medicines</h2>
          <p className="text-sm text-slate-500">Select OTC medicines or type the brand name. Add quantity for each.</p>
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#e7e0d5] bg-white/70 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medicine</label>
                  <div className="relative mt-1">
                    <input
                      value={item.name}
                      onFocus={() => setOpenSuggestionFor(item.id)}
                      onBlur={() => setTimeout(() => setOpenSuggestionFor((prev) => (prev === item.id ? null : prev)), 120)}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      className="w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                      placeholder="Start typing to search"
                      required
                      autoComplete="off"
                    />
                    {openSuggestionFor === item.id && (
                      <div className="absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-[#e7e0d5] bg-white shadow-lg">
                        {lookupOptions
                          .filter((opt) =>
                            item.name.trim()
                              ? opt.name.toLowerCase().includes(item.name.trim().toLowerCase())
                              : true,
                          )
                          .slice(0, 12)
                          .map((opt) => (
                            <button
                              type="button"
                              key={opt.name}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                updateItem(item.id, { name: opt.name });
                                setOpenSuggestionFor(null);
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-800 hover:bg-[#f6f1e9]"
                            >
                              <span>{opt.name}</span>
                              {opt.category && opt.category !== "OTC" && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                                  Rx only
                                </span>
                              )}
                            </button>
                          ))}
                        {lookupOptions.length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500">No suggestions</div>
                        )}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const match = optionMap.get(item.name.trim().toLowerCase());
                    if (match?.category && match.category !== "OTC") {
                      return (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                          Prescription required
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                    className="mt-1 w-24 rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, EMPTY_ITEM()])}
              className="rounded-full border border-dashed border-[#2f6ea5]/40 px-4 py-2 text-xs font-semibold text-[#2f6ea5]"
            >
              + Add another medicine
            </button>
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
        <h2 className="font-serif text-lg text-slate-900">Delivery address</h2>
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

      <label className="text-sm text-slate-700">
        Delivery instructions (optional)
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#e7e0d5] bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          placeholder="Landmark, preferred time, etc."
        />
      </label>

      {rxRequired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <div className="flex flex-col gap-2">
            <div>
              <p className="font-semibold">Prescription upload required</p>
              <p className="text-xs text-amber-700">
                At least one medicine requires a valid prescription. Upload a clear photo or PDF.
              </p>
            </div>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setPrescriptionFile(file);
                setPrescriptionUpload(null);
                setPrescriptionError(null);
              }}
              className="text-xs text-amber-900"
            />
            {prescriptionFile && (
              <p className="text-xs text-amber-700">
                Selected: {prescriptionFile.name} ({(prescriptionFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {prescriptionUpload && (
              <p className="text-xs text-emerald-700">Prescription uploaded.</p>
            )}
            {prescriptionError && <p className="text-xs text-rose-600">{prescriptionError}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-full bg-[#2f6ea5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
        >
          {saving || uploading ? "Preparing checkout…" : "Proceed to payment"}
        </button>
        {message && <p className="text-sm text-rose-600">{message}</p>}
      </div>
    </form>
  );
}
