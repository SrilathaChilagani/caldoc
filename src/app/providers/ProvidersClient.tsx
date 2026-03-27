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
  const [mode, setMode] = useState(initialMode);
  const [language, setLanguage] = useState("");
  const [is24x7, setIs24x7] = useState(false);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  // Filter dropdown state
  const [openFilter, setOpenFilter] = useState<"specialty" | "mode" | "more" | null>(null);
  // Draft state (applied on "Apply" click)
  const [draftSpecialty, setDraftSpecialty] = useState(initialSpecialty);
  const [draftMode, setDraftMode] = useState(initialMode);
  const [draftLanguage, setDraftLanguage] = useState("");
  const [draftIs24x7, setDraftIs24x7] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchProviders = useCallback(
    (params: { city: string; specialty: string; mode: string; language: string; is24x7: boolean; q: string; page: number }) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const sp = new URLSearchParams();
      if (params.city) sp.set("city", params.city);
      if (params.specialty) sp.set("specialty", params.specialty);
      if (params.mode) sp.set("mode", params.mode);
      if (params.language) sp.set("language", params.language);
      if (params.is24x7) sp.set("is24x7", "true");
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

  useEffect(() => {
    fetchProviders({ city, specialty, mode, language, is24x7, q, page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, specialty, mode, language, is24x7, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchProviders({ city, specialty, mode, language, is24x7, q, page: 1 });
  }

  function applySpecialty() {
    setSpecialty(draftSpecialty);
    setPage(1);
    setOpenFilter(null);
  }
  function applyMode() {
    setMode(draftMode);
    setPage(1);
    setOpenFilter(null);
  }
  function applyMore() {
    setLanguage(draftLanguage);
    setIs24x7(draftIs24x7);
    setPage(1);
    setOpenFilter(null);
  }

  function openSpecialty() {
    setDraftSpecialty(specialty);
    setOpenFilter(openFilter === "specialty" ? null : "specialty");
  }
  function openMode() {
    setDraftMode(mode);
    setOpenFilter(openFilter === "mode" ? null : "mode");
  }
  function openMore() {
    setDraftLanguage(language);
    setDraftIs24x7(is24x7);
    setOpenFilter(openFilter === "more" ? null : "more");
  }

  const modeLabel = mode === "IN_PERSON" ? "In-person" : mode === "VIDEO" ? "Video" : "In-person/Video";
  const langLabel = language ? (languageLabels[language] ?? language) : "Language";
  const moreActive = !!language || is24x7;

  // Build map pins
  const mapPins: MapPin[] = [];
  for (const p of providers) {
    for (const c of p.clinics) {
      if (c.lat != null && c.lng != null) {
        mapPins.push({
          id: p.id, name: p.name, speciality: p.speciality,
          lat: c.lat, lng: c.lng, clinicName: c.clinicName,
          address: `${c.addressLine1}, ${c.city}`, slug: p.slug,
        });
        break;
      }
    }
  }

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="bg-[#f7f2ea] min-h-screen">
      {/* ── Search + filter bar ── */}
      <div className="sticky top-0 z-30 border-b border-[#e7e0d5] bg-[#f7f2ea]/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          {/* Row 1: search inputs */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Condition, doctor name, specialty…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
              />
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <input
                list="city-options"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="h-10 w-40 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
              />
              <datalist id="city-options">
                {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <button type="submit" className="h-10 rounded-xl bg-[#2f6ea5] px-6 text-sm font-semibold text-white hover:bg-[#255b8b] transition-colors">
              Search
            </button>
            <button type="button" onClick={() => setShowMap((v) => !v)} className="ml-auto h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 lg:hidden">
              {showMap ? "Hide map" : "Show map"}
            </button>
          </form>

          {/* Row 2: filter chips */}
          <div ref={filterRef} className="relative mt-2.5 flex flex-wrap gap-2">
            {/* Specialty */}
            <div className="relative">
              <button
                type="button"
                onClick={openSpecialty}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  specialty ? "border-[#2f6ea5] bg-[#2f6ea5] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#2f6ea5]/50"
                }`}
              >
                {specialty || "Specialty"}
                <svg className={`h-3.5 w-3.5 transition-transform ${openFilter === "specialty" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {openFilter === "specialty" && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="max-h-72 overflow-y-auto p-3">
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">All specialties</p>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                      <input type="radio" name="specialty" checked={draftSpecialty === ""} onChange={() => setDraftSpecialty("")} className="accent-[#2f6ea5]" />
                      <span className="text-sm font-medium text-slate-700">Any specialty</span>
                    </label>
                    {specialtyOptions.map((sp) => (
                      <label key={sp} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                        <input type="radio" name="specialty" checked={draftSpecialty === sp} onChange={() => setDraftSpecialty(sp)} className="accent-[#2f6ea5]" />
                        <span className="text-sm font-medium text-slate-700">{sp}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <button type="button" onClick={() => { setDraftSpecialty(""); }} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Clear</button>
                    <button type="button" onClick={applySpecialty} className="rounded-full bg-[#2f6ea5] px-5 py-1.5 text-sm font-semibold text-white hover:bg-[#255b8b]">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* In-person / Video */}
            <div className="relative">
              <button
                type="button"
                onClick={openMode}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  mode ? "border-[#2f6ea5] bg-[#2f6ea5] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#2f6ea5]/50"
                }`}
              >
                {modeLabel}
                <svg className={`h-3.5 w-3.5 transition-transform ${openFilter === "mode" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {openFilter === "mode" && (
                <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="p-3">
                    {[
                      { value: "", label: "All modes" },
                      { value: "IN_PERSON", label: "In-person" },
                      { value: "VIDEO", label: "Video consultation" },
                    ].map(({ value, label }) => (
                      <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                        <input type="radio" name="mode" checked={draftMode === value} onChange={() => setDraftMode(value)} className="accent-[#2f6ea5]" />
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <button type="button" onClick={() => setDraftMode("")} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Clear</button>
                    <button type="button" onClick={applyMode} className="rounded-full bg-[#2f6ea5] px-5 py-1.5 text-sm font-semibold text-white hover:bg-[#255b8b]">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* 24×7 toggle chip */}
            <button
              type="button"
              onClick={() => { setIs24x7((v) => !v); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                is24x7 ? "border-[#2f6ea5] bg-[#2f6ea5] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#2f6ea5]/50"
              }`}
            >
              24×7
            </button>

            {/* More filters */}
            <div className="relative">
              <button
                type="button"
                onClick={openMore}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  moreActive ? "border-[#2f6ea5] bg-[#2f6ea5] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#2f6ea5]/50"
                }`}
              >
                More filters
                {moreActive && <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[10px] font-bold">{[language, is24x7].filter(Boolean).length}</span>}
              </button>
              {openFilter === "more" && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="p-4">
                    <p className="mb-3 text-base font-semibold text-slate-900">More filters</p>

                    {/* Language */}
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Language</p>
                    <div className="space-y-1">
                      {[
                        { value: "", label: "Any language" },
                        { value: "en", label: "English" },
                        { value: "hi", label: "Hindi" },
                        { value: "te", label: "Telugu" },
                        { value: "ta", label: "Tamil" },
                        { value: "ur", label: "Urdu" },
                        { value: "bn", label: "Bengali" },
                        { value: "mr", label: "Marathi" },
                      ].map(({ value, label }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                          <input type="radio" name="language" checked={draftLanguage === value} onChange={() => setDraftLanguage(value)} className="accent-[#2f6ea5]" />
                          <span className="text-sm font-medium text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Availability */}
                    <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Availability</p>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                      <input type="checkbox" checked={draftIs24x7} onChange={(e) => setDraftIs24x7(e.target.checked)} className="accent-[#2f6ea5]" />
                      <span className="text-sm font-medium text-slate-700">Available 24×7</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <button type="button" onClick={() => { setDraftLanguage(""); setDraftIs24x7(false); }} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Clear all</button>
                    <button type="button" onClick={applyMore} className="rounded-full bg-[#2f6ea5] px-5 py-1.5 text-sm font-semibold text-white hover:bg-[#255b8b]">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Active filter summary badge */}
            {(specialty || mode || language || is24x7) && (
              <button
                type="button"
                onClick={() => {
                  setSpecialty(""); setMode(""); setLanguage(""); setIs24x7(false);
                  setDraftSpecialty(""); setDraftMode(""); setDraftLanguage(""); setDraftIs24x7(false);
                  setPage(1);
                }}
                className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 whitespace-nowrap hover:bg-red-100 transition-colors"
              >
                Clear filters ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content: list + map ── */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

          {/* Provider list */}
          <div className="min-w-0 flex-1">
            <p className={`mb-3 text-sm text-slate-500 transition-opacity ${isPending ? "opacity-50" : ""}`}>
              {total} provider{total !== 1 ? "s" : ""} found
              {city ? ` in ${city}` : ""}
              {specialty ? ` · ${specialty}` : ""}
              {mode === "IN_PERSON" ? " · In-person" : mode === "VIDEO" ? " · Video" : ""}
              {language ? ` · ${languageLabels[language] ?? language}` : ""}
              {is24x7 ? " · 24×7" : ""}
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

          {/* Map — hidden on mobile by default, full-width when toggled; sidebar on desktop */}
          <div
            className={`lg:sticky lg:top-[148px] lg:block lg:w-[420px] lg:shrink-0 ${showMap ? "block" : "hidden lg:block"}`}
          >
            <div className="h-[50vh] rounded-2xl overflow-hidden border border-slate-200 shadow-sm lg:h-[calc(100vh-168px)]">
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
