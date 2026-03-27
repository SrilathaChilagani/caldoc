"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { MapPin } from "./MapView";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────
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
};

type SlotInfo = { id: string; startsAt: string };

type Provider = {
  id: string;
  slug: string;
  name: string;
  speciality: string;
  qualification?: string | null;
  languages: string[];
  is24x7: boolean;
  defaultFeePaise: number;
  profilePhotoKey?: string | null;
  visitModes: string[];
  clinics: Clinic[];
  slotsByDay: Record<string, SlotInfo[]>;
  days: string[];
};

type Props = {
  initialProviders: Provider[];
  initialTotal: number;
  initialCity: string;
  initialSpecialty: string;
  initialMode: string;
  initialQ: string;
  specialtyOptions: string[];
  patientName?: string;
  patientPhone?: string;
  embed?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────
const languageLabels: Record<string, string> = {
  en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil",
  ur: "Urdu", bn: "Bengali", mr: "Marathi",
};

function formatFee(paise?: number | null) {
  if (!paise || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00+05:30");
  return {
    day: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }),
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
  };
}

function formatSlotTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

const POPULAR_CITIES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Pune", "Kolkata"];

// ── Provider Card with 7-day slot calendar ────────────────────────────
function ProviderCard({
  provider,
  onHover,
  active,
  patientName,
  patientPhone,
  embed,
}: {
  provider: Provider;
  onHover: (id: string | null) => void;
  active: boolean;
  patientName?: string;
  patientPhone?: string;
  embed?: string;
}) {
  const [selectedDay, setSelectedDay] = useState(provider.days[0] ?? "");
  const photoUrl = provider.profilePhotoKey
    ? `/api/providers/${provider.slug}/photo?v=${encodeURIComponent(provider.profilePhotoKey)}`
    : "/images/doc-placeholder.jpg";

  const primaryClinic = provider.clinics[0];
  const slotsForDay = (provider.slotsByDay[selectedDay] ?? []).slice(0, 5);
  const feeLabel = formatFee(provider.defaultFeePaise);

  function withPrefill(href: string) {
    if (!patientName && !patientPhone && !embed) return href;
    const url = new URL(href, "https://caldoc.in");
    if (patientName) url.searchParams.set("patientName", patientName);
    if (patientPhone) url.searchParams.set("patientPhone", patientPhone);
    if (embed) url.searchParams.set("embed", embed);
    return `${url.pathname}${url.search}`;
  }

  const hasInPerson = provider.visitModes.includes("IN_PERSON") || provider.clinics.length > 0;

  return (
    <article
      onMouseEnter={() => onHover(provider.id)}
      onMouseLeave={() => onHover(null)}
      className={`rounded-2xl border bg-white p-5 transition-all duration-200 ${
        active
          ? "border-[#2f6ea5] shadow-[0_4px_20px_-4px_rgba(47,110,165,0.25)]"
          : "border-[#e7e0d5]/60 hover:shadow-[0_4px_20px_-4px_rgba(88,110,132,0.12)]"
      }`}
    >
      {/* Top: photo + info */}
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <Image src={photoUrl} alt={provider.name} fill className="object-cover" sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{provider.name}</p>
              <p className="text-sm font-medium text-[#2f6ea5]">{provider.speciality}</p>
              {provider.qualification && (
                <p className="text-xs text-slate-500">{provider.qualification}</p>
              )}
              {provider.languages.length > 0 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {provider.languages.map((l) => languageLabels[l.toLowerCase()] ?? l).join(", ")}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              {feeLabel && <p className="text-sm font-semibold text-slate-700">{feeLabel}</p>}
              <div className="mt-1 flex flex-wrap gap-1 justify-end">
                {hasInPerson && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    In-person
                  </span>
                )}
                {provider.visitModes.includes("VIDEO") && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                    Video
                  </span>
                )}
                {provider.is24x7 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    24×7
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clinic address */}
          {primaryClinic && (
            <p className="mt-1.5 text-xs text-slate-500">
              📍 {primaryClinic.clinicName}, {primaryClinic.addressLine1}, {primaryClinic.city}
            </p>
          )}
        </div>
      </div>

      {/* 7-day slot calendar */}
      <div className="mt-4">
        {/* Day picker */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {provider.days.map((day) => {
            const { day: d, date } = formatDayLabel(day);
            const count = (provider.slotsByDay[day] ?? []).length;
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex min-w-[56px] flex-col items-center rounded-xl px-2 py-1.5 text-center transition-all ${
                  isSelected
                    ? "bg-[#2f6ea5] text-white"
                    : count > 0
                    ? "border border-slate-200 bg-white text-slate-700 hover:border-[#2f6ea5]/40"
                    : "border border-slate-100 bg-slate-50 text-slate-400 cursor-default"
                }`}
                disabled={count === 0}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">{d}</span>
                <span className="text-[11px] font-medium">{date}</span>
                <span className={`mt-0.5 text-[10px] font-semibold ${
                  isSelected ? "text-blue-200" : count > 0 ? "text-[#2f6ea5]" : "text-slate-300"
                }`}>
                  {count > 0 ? `${count} slot${count === 1 ? "" : "s"}` : "No slots"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slots for selected day */}
        {slotsForDay.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {slotsForDay.map((slot) => (
              <Link
                key={slot.id}
                href={withPrefill(`/book/${encodeURIComponent(provider.slug || provider.id)}?slot=${slot.id}&mode=${hasInPerson && !provider.visitModes.includes("VIDEO") ? "IN_PERSON" : "VIDEO"}`)}
                className="rounded-lg border border-[#2f6ea5]/30 bg-[#e7edf3] px-3 py-1 text-xs font-semibold text-[#2f6ea5] hover:border-[#2f6ea5]/60 hover:bg-[#d9e4ee] transition-colors"
              >
                {formatSlotTime(slot.startsAt)}
              </Link>
            ))}
            <Link
              href={withPrefill(`/book/${encodeURIComponent(provider.slug || provider.id)}`)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 transition-colors"
            >
              More →
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No slots available for this day</p>
        )}
      </div>
    </article>
  );
}

// ── Main client component ─────────────────────────────────────────────
export default function ProvidersClient({
  initialProviders,
  initialTotal,
  initialCity,
  initialSpecialty,
  initialMode,
  initialQ,
  specialtyOptions,
  patientName,
  patientPhone,
  embed,
}: Props) {
  const [providers, setProviders] = useState<Provider[]>(initialProviders);
  const [total, setTotal] = useState(initialTotal);
  const [city, setCity] = useState(initialCity || "Hyderabad");
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [mode, setMode] = useState(initialMode); // "" | "IN_PERSON" | "VIDEO"
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const fetchProviders = useCallback(
    (params: { city: string; specialty: string; mode: string; q: string; page: number }) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const sp = new URLSearchParams();
      if (params.city) sp.set("city", params.city);
      if (params.specialty) sp.set("specialty", params.specialty);
      if (params.mode) sp.set("mode", params.mode);
      if (params.q) sp.set("q", params.q);
      sp.set("page", String(params.page));
      sp.set("pageSize", "12");

      startTransition(async () => {
        try {
          const res = await fetch(`/api/providers/search?${sp.toString()}`, { signal: ctrl.signal });
          if (!res.ok) return;
          const data = await res.json();
          setProviders(data.providers ?? []);
          setTotal(data.total ?? 0);
        } catch {
          // AbortError on unmount — ignore
        }
      });
    },
    []
  );

  // Re-fetch when filters change
  useEffect(() => {
    fetchProviders({ city, specialty, mode, q, page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, specialty, mode, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchProviders({ city, specialty, mode, q, page: 1 });
  }

  // Build map pins from providers that have lat/lng
  const mapPins: MapPin[] = [];
  for (const p of providers) {
    for (const c of p.clinics) {
      if (c.lat != null && c.lng != null) {
        mapPins.push({
          id: p.id,
          name: p.name,
          speciality: p.speciality,
          lat: c.lat,
          lng: c.lng,
          clinicName: c.clinicName,
          address: `${c.addressLine1}, ${c.city}`,
          slug: p.slug,
        });
        break; // one pin per provider
      }
    }
  }

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="bg-[#f7f2ea] min-h-screen">
      {/* ── Search bar ── */}
      <div className="sticky top-0 z-30 border-b border-[#e7e0d5] bg-[#f7f2ea]/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
            {/* Condition / doctor search */}
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Condition, doctor name, specialty…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
              />
            </div>

            {/* City */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <input
                list="city-options"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City / Pincode"
                className="h-10 w-44 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
              />
              <datalist id="city-options">
                {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => { setMode(""); setPage(1); }}
                className={`px-3 py-2 transition-colors ${mode === "" ? "bg-[#2f6ea5] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setMode("IN_PERSON"); setPage(1); }}
                className={`px-3 py-2 transition-colors border-l border-slate-200 ${mode === "IN_PERSON" ? "bg-[#2f6ea5] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                In-person
              </button>
              <button
                type="button"
                onClick={() => { setMode("VIDEO"); setPage(1); }}
                className={`px-3 py-2 transition-colors border-l border-slate-200 ${mode === "VIDEO" ? "bg-[#2f6ea5] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                Video
              </button>
            </div>

            <button
              type="submit"
              className="h-10 rounded-xl bg-[#2f6ea5] px-6 text-sm font-semibold text-white hover:bg-[#255b8b] transition-colors"
            >
              Search
            </button>

            {/* Map toggle (mobile) */}
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="ml-auto h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              {showMap ? "Hide map" : "Show map"}
            </button>
          </form>

          {/* Specialty pill filters */}
          {specialtyOptions.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => { setSpecialty(""); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${specialty === "" ? "bg-[#2f6ea5] text-white" : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5]/40"}`}
              >
                All specialties
              </button>
              {specialtyOptions.slice(0, 10).map((sp) => (
                <button
                  key={sp}
                  onClick={() => { setSpecialty(sp); setPage(1); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${specialty === sp ? "bg-[#2f6ea5] text-white" : "border border-slate-200 text-slate-600 hover:border-[#2f6ea5]/40"}`}
                >
                  {sp}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content: list + map ── */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex gap-4 items-start">

          {/* Provider list */}
          <div className="min-w-0 flex-1">
            <p className={`mb-3 text-sm text-slate-500 transition-opacity ${isPending ? "opacity-50" : ""}`}>
              {total} provider{total !== 1 ? "s" : ""} found
              {city ? ` in ${city}` : ""}
              {mode === "IN_PERSON" ? " · In-person" : mode === "VIDEO" ? " · Video" : ""}
            </p>

            <div className={`space-y-3 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
              {providers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#e7e0d5] bg-white/60 px-6 py-16 text-center">
                  <p className="text-slate-500">No providers found. Try changing the city or removing filters.</p>
                  {mode === "IN_PERSON" && (
                    <p className="mt-2 text-xs text-slate-400">In-person providers are added as clinics are onboarded.</p>
                  )}
                </div>
              ) : (
                providers.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    onHover={setActivePin}
                    active={activePin === p.id}
                    patientName={patientName}
                    patientPhone={patientPhone}
                    embed={embed}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {page > 1 && (
                  <button onClick={() => setPage((p) => p - 1)} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                    ← Prev
                  </button>
                )}
                <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <button onClick={() => setPage((p) => p + 1)} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Map (sticky, desktop: always visible) */}
          <div
            className={`shrink-0 lg:sticky lg:top-[120px] lg:block ${showMap ? "block" : "hidden"}`}
            style={{ width: "420px", height: "calc(100vh - 140px)" }}
          >
            <div className="h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <MapView
                pins={mapPins}
                activeId={activePin}
                onPinClick={setActivePin}
                city={city}
              />
              {mapPins.length === 0 && (
                <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                  <div className="rounded-xl bg-white/90 px-4 py-2 text-xs text-slate-500 shadow backdrop-blur-sm">
                    {mode === "IN_PERSON"
                      ? "Add clinic locations in admin to see map pins"
                      : "Map pins appear for in-person providers with clinic addresses"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
