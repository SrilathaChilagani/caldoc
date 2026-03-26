"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Clinic = {
  id: string;
  clinicName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  isActive: boolean;
};

const EMPTY_FORM = {
  clinicName: "",
  addressLine1: "",
  addressLine2: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "",
  lat: "",
  lng: "",
  phone: "",
};

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

export default function ProviderClinicPage() {
  const params = useParams();
  const providerId = params?.id as string;

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [providerName, setProviderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    // Load provider name
    fetch(`/api/admin/providers`)
      .then((r) => r.json())
      .then((d) => {
        const p = (d.providers as Array<{ id: string; name: string }>)?.find((x) => x.id === providerId);
        if (p) setProviderName(p.name);
      })
      .catch(() => {});

    // Load clinics
    fetch(`/api/admin/providers/${providerId}/clinic`)
      .then((r) => r.json())
      .then((d) => { setClinics(d.clinics ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [providerId]);

  async function geocodeAddress() {
    const addr = [form.addressLine1, form.city, form.state, form.pincode].filter(Boolean).join(", ");
    if (!addr) return;
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=in`);
      const data = await res.json();
      if (data?.[0]) {
        setForm((f) => ({ ...f, lat: String(parseFloat(data[0].lat).toFixed(6)), lng: String(parseFloat(data[0].lon).toFixed(6)) }));
      } else {
        setError("Could not find location. Enter lat/lng manually.");
      }
    } catch {
      setError("Geocoding failed. Enter lat/lng manually.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        clinicName: form.clinicName.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        phone: form.phone.trim() || null,
      };

      const url = editId
        ? `/api/admin/providers/${providerId}/clinic/${editId}`
        : `/api/admin/providers/${providerId}/clinic`;
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (editId) {
        setClinics((cs) => cs.map((c) => c.id === editId ? data.clinic : c));
      } else {
        setClinics((cs) => [...cs, data.clinic]);
      }
      setForm(EMPTY_FORM); setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(clinicId: string) {
    if (!confirm("Delete this clinic location?")) return;
    const res = await fetch(`/api/admin/providers/${providerId}/clinic/${clinicId}`, { method: "DELETE" });
    if (res.ok) setClinics((cs) => cs.filter((c) => c.id !== clinicId));
  }

  function startEdit(clinic: Clinic) {
    setEditId(clinic.id);
    setForm({
      clinicName: clinic.clinicName,
      addressLine1: clinic.addressLine1,
      addressLine2: clinic.addressLine2 ?? "",
      city: clinic.city,
      state: clinic.state,
      pincode: clinic.pincode,
      lat: clinic.lat != null ? String(clinic.lat) : "",
      lng: clinic.lng != null ? String(clinic.lng) : "",
      phone: clinic.phone ?? "",
    });
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <Link href="/admin/providers" className="text-sm text-[#2f6ea5] hover:underline">← Back to providers</Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-2xl font-semibold text-slate-900">
          Clinic locations{providerName ? ` · ${providerName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add physical clinic addresses. Lat/lng enables the map pin on the Find a Doctor page.
        </p>
      </div>

      {/* Existing clinics */}
      {!loading && clinics.length > 0 && (
        <div className="space-y-3">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{clinic.clinicName}</p>
                <p className="text-sm text-slate-600">{clinic.addressLine1}{clinic.addressLine2 ? `, ${clinic.addressLine2}` : ""}</p>
                <p className="text-sm text-slate-500">{clinic.city}, {clinic.state} – {clinic.pincode}</p>
                {clinic.lat != null && clinic.lng != null && (
                  <p className="text-xs text-emerald-600 mt-0.5">📍 {clinic.lat.toFixed(4)}, {clinic.lng.toFixed(4)}</p>
                )}
                {!clinic.lat && <p className="text-xs text-amber-600 mt-0.5">⚠ No coordinates — won&apos;t appear on map</p>}
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${clinic.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {clinic.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(clinic)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">Edit</button>
                <button onClick={() => handleDelete(clinic.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && clinics.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No clinic locations yet. Add one below.
        </p>
      )}

      {/* Add / edit form */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">{editId ? "Edit clinic" : "Add clinic location"}</h2>
        {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Clinic / Hospital name *">
            <input required value={form.clinicName} onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))} className={inputCls} placeholder="e.g. Apollo Clinic, Banjara Hills" />
          </Field>
          <Field label="Address line 1 *">
            <input required value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} className={inputCls} placeholder="Street / Building / Floor" />
          </Field>
          <Field label="Address line 2">
            <input value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} className={inputCls} placeholder="Landmark / Area (optional)" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City *">
              <input required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Pincode *">
              <input required value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} className={inputCls} placeholder="500032" />
            </Field>
          </div>
          <Field label="State *">
            <select required value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inputCls}>
              {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Clinic phone">
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+91 40 1234 5678" />
          </Field>

          {/* Lat/lng with geocode helper */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Coordinates (for map pin)</p>
              <button type="button" onClick={geocodeAddress} disabled={geocoding} className="rounded-lg border border-[#2f6ea5]/40 px-3 py-1 text-xs font-semibold text-[#2f6ea5] hover:bg-[#2f6ea5]/5 disabled:opacity-50">
                {geocoding ? "Finding…" : "Auto-detect from address"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude">
                <input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} className={inputCls} placeholder="17.3850" />
              </Field>
              <Field label="Longitude">
                <input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} className={inputCls} placeholder="78.4867" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="rounded-full bg-[#2f6ea5] px-6 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60">
              {saving ? "Saving…" : editId ? "Update clinic" : "Add clinic"}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "mt-0.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}
