"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { MapPin } from "./MapView";
import { formatLanguage, LANGUAGE_OPTIONS } from "@/config/languages";
import { SYMPTOM_QUICK_PICKS } from "@/config/symptomSpecialtyMap";

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
  registrationNumber?: string | null;
  councilName?: string | null;
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
function formatFee(paise?: number | null) {
  if (!paise || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
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

// ── Availability computation ──────────────────────────────────────────
type AvailInfo = {
  status: "soon" | "today" | "tomorrow" | "later" | "no_slots";
  headline: string;
  subline?: string;
};

function computeAvailability(allSlots: SlotInfo[], is24x7: boolean): AvailInfo {
  const now = Date.now();
  // Client-side filter guards against stale 60 s cache entries
  const upcoming = allSlots.filter((s) => new Date(s.startsAt).getTime() > now);

  if (upcoming.length === 0) {
    return {
      status: "no_slots",
      headline: "No upcoming slots",
      subline: is24x7 ? "Accepts 24×7 bookings" : undefined,
    };
  }

  const next = upcoming[0];
  const nextMs = new Date(next.startsAt).getTime();
  const diffMin = Math.round((nextMs - now) / 60_000);

  const timeStr = new Date(next.startsAt).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });

  // Within next 90 minutes → show countdown
  if (diffMin <= 90) {
    const countdownLabel = diffMin <= 1 ? "in < 1 min" : diffMin < 60 ? `in ${diffMin} min` : "in ~1 hr";
    return { status: "soon", headline: countdownLabel, subline: timeStr };
  }

  const locale = "en-CA"; // gives YYYY-MM-DD format
  const todayIST = new Date(now).toLocaleDateString(locale, { timeZone: "Asia/Kolkata" });
  const tomorrowIST = new Date(now + 86_400_000).toLocaleDateString(locale, { timeZone: "Asia/Kolkata" });
  const nextDayIST = new Date(nextMs).toLocaleDateString(locale, { timeZone: "Asia/Kolkata" });

  if (nextDayIST === todayIST) {
    return { status: "today", headline: "Today", subline: `at ${timeStr}` };
  }
  if (nextDayIST === tomorrowIST) {
    return { status: "tomorrow", headline: "Tomorrow", subline: `at ${timeStr}` };
  }

  const dayLabel = new Date(nextMs).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata",
  });
  return { status: "later", headline: dayLabel, subline: `at ${timeStr}` };
}

function AvailabilityLabel({ avail }: { avail: AvailInfo }) {
  if (avail.status === "no_slots") {
    return (
      <>
        <p className="mt-0.5 text-sm text-slate-400">{avail.headline}</p>
        {avail.subline && <p className="text-[10px] text-amber-600">{avail.subline}</p>}
      </>
    );
  }
  const headlineColor =
    avail.status === "soon" || avail.status === "today"
      ? "text-emerald-700"
      : avail.status === "tomorrow"
        ? "text-[#2f6ea5]"
        : "text-slate-700";
  return (
    <>
      <p className={`mt-0.5 text-sm font-semibold ${headlineColor}`}>{avail.headline}</p>
      {avail.subline && <p className="text-xs text-slate-500">{avail.subline}</p>}
    </>
  );
}

const POPULAR_CITIES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Pune", "Kolkata"];

const AVATAR_GRADIENTS = [
  "from-[#4f7bba] to-[#3a6aa8]",
  "from-[#43a890] to-[#2e8a74]",
  "from-[#7b6fd4] to-[#6159bb]",
  "from-[#d4756b] to-[#b85e55]",
  "from-[#5aab8f] to-[#3d8f74]",
  "from-[#e08a44] to-[#c8722f]",
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ── Provider Card ─────────────────────────────────────────────────────
function ProviderCard({
  provider,
  index,
  onHover,
  active,
  patientName,
  patientPhone,
  embed,
}: {
  provider: Provider;
  index: number;
  onHover: (id: string | null) => void;
  active: boolean;
  patientName?: string;
  patientPhone?: string;
  embed?: string;
}) {
  const [selectedDay, setSelectedDay] = useState(provider.days[0] ?? "");
  const photoUrl = provider.profilePhotoKey
    ? `/api/providers/${provider.slug}/photo?v=${encodeURIComponent(provider.profilePhotoKey)}`
    : null;

  const primaryClinic = provider.clinics[0];
  const slotsForDay = (provider.slotsByDay[selectedDay] ?? []).slice(0, 5);
  const feeLabel = formatFee(provider.defaultFeePaise);
  const initials = getInitials(provider.name);
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const hasInPerson = provider.visitModes.includes("IN_PERSON") || provider.clinics.length > 0;

  const allSlots = provider.days
    .flatMap((d) => provider.slotsByDay[d] ?? [])
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const avail = computeAvailability(allSlots, provider.is24x7);

  function withPrefill(href: string) {
    if (!patientName && !patientPhone && !embed) return href;
    const url = new URL(href, "https://caldoc.in");
    if (patientName) url.searchParams.set("patientName", patientName);
    if (patientPhone) url.searchParams.set("patientPhone", patientPhone);
    if (embed) url.searchParams.set("embed", embed);
    return `${url.pathname}${url.search}`;
  }

  const bookHref = withPrefill(`/book/${encodeURIComponent(provider.slug || provider.id)}`);

  return (
    <article
      onMouseEnter={() => onHover(provider.id)}
      onMouseLeave={() => onHover(null)}
      className={`rounded-2xl border bg-white transition-all duration-200 ${
        active
          ? "border-[#2f6ea5] shadow-[0_4px_20px_-4px_rgba(47,110,165,0.25)]"
          : "border-slate-200 hover:shadow-[0_4px_16px_-4px_rgba(88,110,132,0.15)]"
      }`}
    >
      {/* Main row */}
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {photoUrl ? (
            <Image src={photoUrl} alt={provider.name} fill className="object-cover" sizes="64px" />
          ) : (
            <span className="text-xl font-bold text-white">{initials}</span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">{provider.name}</p>
          <p className="text-sm font-semibold text-[#2f6ea5]">{provider.speciality}</p>
          {provider.qualification && (
            <p className="mt-0.5 text-xs text-slate-500">{provider.qualification}</p>
          )}
          {provider.registrationNumber ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Reg. {provider.registrationNumber}
              {provider.councilName && <span className="text-slate-400">· {provider.councilName}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-600">Registration pending verification</p>
          )}
          {provider.languages.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
              {provider.languages.map(formatLanguage).join(", ")}
            </p>
          )}
          {feeLabel && (
            <p className="mt-1 text-xs text-slate-600">
              Consultation fee: <span className="font-semibold">{feeLabel}</span>
            </p>
          )}
          {primaryClinic && (
            <p className="mt-0.5 text-xs text-slate-400">📍 {primaryClinic.clinicName}, {primaryClinic.city}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {provider.is24x7 && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                24×7
              </span>
            )}
            {hasInPerson && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                In-person
              </span>
            )}
            {provider.visitModes.includes("VIDEO") && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Video
              </span>
            )}
          </div>
        </div>

        {/* AVAILABILITY + Book */}
        <div className="flex shrink-0 flex-col items-end gap-3 pl-2">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Available</p>
            <AvailabilityLabel avail={avail} />
          </div>
          <Link
            href={bookHref}
            className="whitespace-nowrap rounded-xl bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#255b8b]"
          >
            Book doctor
          </Link>
        </div>
      </div>

      {/* 7-day slot calendar */}
      <div className="border-t border-slate-100 px-5 pb-4 pt-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {provider.days.map((day) => {
            const { day: d, date } = formatDayLabel(day);
            const count = (provider.slotsByDay[day] ?? []).length;
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex min-w-[54px] flex-col items-center rounded-xl px-2 py-1.5 text-center transition-all ${
                  isSelected ? "bg-[#2f6ea5] text-white"
                  : count > 0 ? "border border-slate-200 bg-white text-slate-700 hover:border-[#2f6ea5]/40"
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
        {slotsForDay.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {slotsForDay.map((slot) => (
              <Link
                key={slot.id}
                href={withPrefill(`/book/${encodeURIComponent(provider.slug || provider.id)}?slot=${slot.id}&mode=${hasInPerson && !provider.visitModes.includes("VIDEO") ? "IN_PERSON" : "VIDEO"}`)}
                className="rounded-lg border border-[#2f6ea5]/30 bg-[#e7edf3] px-3 py-1 text-xs font-semibold text-[#2f6ea5] transition-colors hover:border-[#2f6ea5]/60 hover:bg-[#d9e4ee]"
              >
                {formatSlotTime(slot.startsAt)}
              </Link>
            ))}
            <Link
              href={bookHref}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300"
            >
              More →
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No slots available for this day</p>
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
  const [avail, setAvail] = useState("any"); // "any" | "today" | "week" | "24x7"
  const [gender, setGender] = useState("");
  const [feeRange, setFeeRange] = useState(""); // "under500" | "mid" | "over1000"
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  // initialProviders is already server-rendered for the initial filter
  // state — skip the redundant fetch on mount so the page is usable
  // immediately instead of after an extra uncached round-trip.
  const hydratedRef = useRef(false);

  const fetchProviders = useCallback(
    (params: {
      city: string; specialty: string; mode: string; language: string;
      avail: string; gender: string; feeRange: string; q: string; page: number;
    }) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const sp = new URLSearchParams();
      if (params.city) sp.set("city", params.city);
      if (params.specialty) sp.set("specialty", params.specialty);
      if (params.mode) sp.set("mode", params.mode);
      if (params.language) sp.set("language", params.language);
      if (params.avail !== "any") sp.set("avail", params.avail);
      if (params.gender) sp.set("gender", params.gender);
      if (params.feeRange) sp.set("feeRange", params.feeRange);
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
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    fetchProviders({ city, specialty, mode, language, avail, gender, feeRange, q, page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, specialty, mode, language, avail, gender, feeRange, page]);

  // Sync filter state when the URL changes via header links
  // (e.g. clicking a specialty in the Specialties dropdown while
  // already on /providers — soft nav updates the URL but not our state).
  const searchParams = useSearchParams();
  useEffect(() => {
    const urlSpecialty = searchParams.get("specialty") ?? "";
    const urlCity = searchParams.get("city") ?? "";
    const urlMode = (searchParams.get("mode") ?? "").toUpperCase();
    const urlQ = searchParams.get("q") ?? "";
    setSpecialty(urlSpecialty);
    if (urlCity) setCity(urlCity);
    setMode(urlMode);
    setQ(urlQ);
    setPage(1);
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchProviders({ city, specialty, mode, language, avail, gender, feeRange, q, page: 1 });
  }

  function clearAllFilters() {
    setSpecialty(""); setMode(""); setLanguage(""); setGender(""); setFeeRange(""); setAvail("any"); setPage(1);
  }

  const hasActiveFilters = !!(specialty || mode || language || gender || feeRange || avail !== "any");

  // Map pins
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
    <div className="min-h-screen bg-gray-100">

      {/* ── Hero — pulls behind transparent header via -mt-16 ── */}
      <div className="relative -mt-16 overflow-hidden bg-slate-800" style={{ minHeight: 320 }}>
        <Image
          src="/images/hero-doctor-2.jpg"
          alt="Find a doctor"
          fill
          className="object-cover object-top"
          sizes="100vw"
          priority
        />
        {/* left fade so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        {/* bottom fade blends hero into the content section below */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-gray-100 to-transparent" />

        {/* content — padded top to clear the header (pt-20 = 16px header + 4px gap) */}
        <div className="relative px-8 pb-10 pt-24 lg:px-16 xl:px-24">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to home
          </Link>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Find a doctor</h1>

          <form onSubmit={handleSearch} className="mt-5 flex max-w-2xl items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search specialties, doctor names, symptoms, or registration number"
                className="h-12 w-full rounded-xl border-0 bg-white pl-11 pr-4 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
              />
            </div>
            <div className="relative">
              <input
                list="city-options"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="h-12 w-32 rounded-xl border-0 bg-white px-3 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]"
              />
              <datalist id="city-options">
                {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <button
              type="submit"
              className="h-12 rounded-xl bg-[#2f6ea5] px-7 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#255b8b]"
            >
              Search
            </button>
          </form>

          {/* Symptom / condition quick-picks — guide to specialty without diagnosing */}
          <div className="mt-3 flex max-w-2xl flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-slate-500/80">Find doctors for:</span>
            {SYMPTOM_QUICK_PICKS.map((pick) => (
              <button
                key={pick.label}
                type="button"
                onClick={() => { setSpecialty(pick.specialty); setQ(""); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  specialty === pick.specialty
                    ? "bg-[#2f6ea5] text-white"
                    : "bg-white/80 text-slate-700 hover:bg-white"
                }`}
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex gap-0 items-start mx-6 lg:mx-16 xl:mx-24 mt-6 mb-8">

        {/* ── Left: Filters sidebar ── */}
        <aside className="hidden w-56 shrink-0 sticky top-0 h-screen overflow-y-auto lg:block bg-gray-100 px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Filters</h2>
            {hasActiveFilters && (
              <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-[#2f6ea5] hover:underline">
                Clear all
              </button>
            )}
          </div>

          {/* AVAILABILITY */}
          <div className="mb-5">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Availability</p>
            <div className="space-y-2.5">
              {[
                { label: "Any time", value: "any" },
                { label: "Available today", value: "today" },
                { label: "Available this week", value: "week" },
                { label: "24×7 doctors", value: "24x7" },
              ].map(({ label, value }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="availability" checked={avail === value}
                    onChange={() => { setAvail(value); setPage(1); }} className="accent-[#2f6ea5]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CONSULTATION TYPE */}
          <div className="mb-5 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Consultation Type</p>
            <div className="space-y-2.5">
              {[
                { label: "All types", value: "" },
                { label: "Audio Call", value: "AUDIO" },
                { label: "Video Call", value: "VIDEO" },
                { label: "In-person", value: "IN_PERSON" },
              ].map(({ label, value }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="mode" checked={mode === value}
                    onChange={() => { setMode(value); setPage(1); }} className="accent-[#2f6ea5]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SPECIALTY */}
          <div className="mb-5 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Specialty</p>
            <div className="max-h-52 space-y-2.5 overflow-y-auto pr-1">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="radio" name="specialty" checked={specialty === ""}
                  onChange={() => { setSpecialty(""); setPage(1); }} className="accent-[#2f6ea5]" />
                <span className="text-sm text-slate-700">Any specialty</span>
              </label>
              {specialtyOptions.map((sp) => (
                <label key={sp} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="specialty" checked={specialty === sp}
                    onChange={() => { setSpecialty(sp); setPage(1); }} className="accent-[#2f6ea5]" />
                  <span className="text-sm text-slate-700">{sp}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CONSULTATION FEE */}
          <div className="mb-5 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Consultation Fee</p>
            <div className="space-y-2.5">
              {[
                { label: "Any price", value: "" },
                { label: "Under ₹500", value: "under500" },
                { label: "₹500 – ₹1,000", value: "mid" },
                { label: "Over ₹1,000", value: "over1000" },
              ].map(({ label, value }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="fee" checked={feeRange === value}
                    onChange={() => { setFeeRange(value); setPage(1); }} className="accent-[#2f6ea5]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* DOCTOR GENDER */}
          <div className="mb-5 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor Gender</p>
            <div className="space-y-2.5">
              {[
                { label: "Any", value: "" },
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
              ].map(({ label, value }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="gender" checked={gender === value}
                    onChange={() => { setGender(value); setPage(1); }} className="accent-[#2f6ea5]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* LANGUAGE */}
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Language</p>
            <div className="max-h-44 space-y-2.5 overflow-y-auto pr-1">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="radio" name="language" checked={language === ""}
                  onChange={() => { setLanguage(""); setPage(1); }} className="accent-[#2f6ea5]" />
                <span className="text-sm text-slate-700">Any language</span>
              </label>
              {LANGUAGE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="language" checked={language === value}
                    onChange={() => { setLanguage(value); setPage(1); }} className="accent-[#2f6ea5]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Center: Provider list ── */}
        <div className="min-w-0 flex-1 bg-gray-100 px-5 py-6">
          {/* Mobile controls */}
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <button type="button" onClick={() => setShowMap((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {showMap ? "Hide map" : "Show map"}
            </button>
            {hasActiveFilters && (
              <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-rose-600">
                Clear filters ×
              </button>
            )}
          </div>

          <p className={`mb-3 text-sm text-slate-500 transition-opacity ${isPending ? "opacity-50" : ""}`}>
            {total} provider{total !== 1 ? "s" : ""} found
            {city ? ` in ${city}` : ""}
            {specialty ? ` · ${specialty}` : ""}
            {mode === "IN_PERSON" ? " · In-person" : mode === "VIDEO" ? " · Video" : mode === "AUDIO" ? " · Audio" : ""}
            {language ? ` · ${formatLanguage(language)}` : ""}
            {avail !== "any" ? ` · ${{ today: "Today", week: "This week", "24x7": "24×7" }[avail] ?? avail}` : ""}
            {gender ? ` · ${gender}` : ""}
            {feeRange ? ` · ${{ under500: "Under ₹500", mid: "₹500–₹1,000", over1000: "Over ₹1,000" }[feeRange] ?? ""}` : ""}
          </p>

          <div className={`space-y-4 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
            {providers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-slate-500">No providers found. Try changing the city or removing filters.</p>
                {mode === "IN_PERSON" && (
                  <p className="mt-2 text-xs text-slate-400">In-person providers are added as clinics are onboarded.</p>
                )}
              </div>
            ) : (
              providers.map((p, i) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  index={i}
                  onHover={setActivePin}
                  active={activePin === p.id}
                  patientName={patientName}
                  patientPhone={patientPhone}
                  embed={embed}
                />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <button onClick={() => setPage((p) => p - 1)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                  ← Prev
                </button>
              )}
              <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <button onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
                  Next →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Map — sticky, full viewport height ── */}
        <div className={`lg:sticky lg:top-0 lg:block lg:w-[380px] lg:shrink-0 ${showMap ? "block" : "hidden lg:block"}`}>
          <div className="h-screen overflow-hidden rounded-xl">
            <MapView pins={mapPins} activeId={activePin} onPinClick={setActivePin} city={city} />
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
  );
}
