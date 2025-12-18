"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SlotInfo = {
  id: string;
  startsAt: string;
  feePaise?: number | null;
};

type ProviderInfo = {
  id: string;
  name: string;
  speciality: string;
  slug: string;
  languages: string[];
  defaultFeePaise?: number | null;
  slots: SlotInfo[];
};

type Props = {
  specialties: string[];
};

type SelectedSlot = {
  slotId: string;
  providerId: string;
  providerName: string;
  startsAt: string;
};

function formatSlotLabel(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFee(paise?: number | null) {
  if (typeof paise !== "number" || Number.isNaN(paise) || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
  { value: "ta", label: "Tamil" },
  { value: "ur", label: "Urdu" },
  { value: "bn", label: "Bengali" },
  { value: "mr", label: "Marathi" },
];

const availabilityOptions = [
  { value: "next30", label: "Available in next 30 mins" },
  { value: "today", label: "Available today" },
  { value: "week", label: "Available this week" },
];

const genderOptions = [
  { value: "any", label: "Any" },
  { value: "female", label: "Female doctors" },
  { value: "male", label: "Male doctors" },
];

const experienceOptions = [
  { value: "lt5", label: "0 – 5 years" },
  { value: "btw5and10", label: "5 – 10 years" },
  { value: "gt10", label: "10+ years" },
];

const providerMeta: Record<
  string,
  {
    gender: "male" | "female" | "other";
    experience: number | null;
  }
> = {
  "dr-asha-menon": { gender: "female", experience: 12 },
  "dr-rohan-iyer": { gender: "male", experience: 8 },
  "dr-saira-khan": { gender: "female", experience: 10 },
  "dr-lidiya-thomas": { gender: "female", experience: 7 },
};

function matchesExperienceFilter(range: string, experience: number | null) {
  if (!range) return true;
  if (experience == null || Number.isNaN(experience)) return false;
  if (range === "lt5") return experience < 5;
  if (range === "btw5and10") return experience >= 5 && experience <= 10;
  if (range === "gt10") return experience > 10;
  return true;
}

export default function NgoBulkBooking({ specialties }: Props) {
  const [speciality, setSpeciality] = useState<string>("all");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<string[]>([]);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement | null>(null);
  const [availability, setAvailability] = useState<string>("");
  const [gender, setGender] = useState<string>("any");
  const [experience, setExperience] = useState<string>("");
  const [languageFilters, setLanguageFilters] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, SelectedSlot>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProviders(signal?: AbortSignal) {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (speciality) params.set("speciality", speciality);
        const res = await fetch(`/api/ngo/providers?${params.toString()}`, { signal });
        if (!res.ok) throw new Error("Unable to load providers");
        const data = await res.json();
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        setProviderFilter([]);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Unable to load providers");
        }
      } finally {
        setLoading(false);
      }
    }

    const controller = new AbortController();
    loadProviders(controller.signal);
    return () => controller.abort();
  }, [speciality]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setProviderDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProviders = useMemo(() => {
    const langSet = new Set(languageFilters.map((lang) => lang.toLowerCase()));
    const providerIdSet = providerFilter.length ? new Set(providerFilter) : null;
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const halfHourEnd = new Date(now.getTime() + 30 * 60 * 1000);

    const filterSlotsByAvailability = (slots: SlotInfo[]) => {
      if (!availability) return slots;
      if (availability === "next30") {
        return slots.filter((slot) => {
          const date = new Date(slot.startsAt);
          return date >= now && date <= halfHourEnd;
        });
      }
      if (availability === "today") {
        return slots.filter((slot) => {
          const date = new Date(slot.startsAt);
          return date >= now && date <= todayEnd;
        });
      }
      if (availability === "week") {
        return slots.filter((slot) => {
          const date = new Date(slot.startsAt);
          return date >= now && date <= weekEnd;
        });
      }
      return slots;
    };

    return providers
      .map((provider) => {
        if (providerIdSet && !providerIdSet.has(provider.id)) return null;
        const meta = providerMeta[provider.slug] || { gender: "other" as const, experience: null };
        if (gender !== "any" && meta.gender !== gender) return null;
        if (experience && !matchesExperienceFilter(experience, meta.experience)) return null;
        if (langSet.size) {
          const providerLangs = provider.languages.map((lang) => lang.toLowerCase());
          const hasLang = providerLangs.some((lang) => langSet.has(lang));
          if (!hasLang) return null;
        }
        const slots = filterSlotsByAvailability(provider.slots);
        if (!slots.length) return null;
        return { ...provider, slots };
      })
      .filter((provider): provider is ProviderInfo => Boolean(provider));
  }, [providers, providerFilter, gender, experience, availability, languageFilters]);

  const providerOptions = useMemo(
    () =>
      providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
      })),
    [providers],
  );

  const filteredProviderCount = filteredProviders.length;
  const totalSelected = Object.keys(selectedSlots).length;

  function toggleSlot(provider: ProviderInfo, slot: SlotInfo, checked: boolean) {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      if (checked) {
        next[slot.id] = {
          slotId: slot.id,
          providerId: provider.id,
          providerName: provider.name,
          startsAt: slot.startsAt,
        };
      } else {
        delete next[slot.id];
      }
      return next;
    });
  }

  function handleSelectAll(provider: ProviderInfo) {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      provider.slots.forEach((slot) => {
        next[slot.id] = {
          slotId: slot.id,
          providerId: provider.id,
          providerName: provider.name,
          startsAt: slot.startsAt,
        };
      });
      return next;
    });
  }

  function handleClearProvider(provider: ProviderInfo) {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      provider.slots.forEach((slot) => delete next[slot.id]);
      return next;
    });
  }

  async function handleReserve() {
    const slotIds = Object.keys(selectedSlots);
    if (!slotIds.length) {
      setError("Select at least one slot");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      const res = await fetch("/api/ngo/bulk-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unable to reserve slots");
      setSuccessMessage("Slots reserved successfully");
      setSelectedSlots({});
      const params = new URLSearchParams();
      if (speciality) params.set("speciality", speciality);
      const refreshed = await fetch(`/api/ngo/providers?${params.toString()}`);
      if (refreshed.ok) {
        const json = await refreshed.json();
        setProviders(Array.isArray(json.providers) ? json.providers : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reserve slots");
    } finally {
      setSaving(false);
    }
  }

  const selectedSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    Object.values(selectedSlots).forEach((slot) => {
      summary[slot.providerName] = (summary[slot.providerName] || 0) + 1;
    });
    return summary;
  }, [selectedSlots]);

  const filterSidebar = (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Availability</p>
        <div className="mt-2 space-y-2">
          {availabilityOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="availability"
                value={option.value}
                checked={availability === option.value}
                onChange={(e) => setAvailability(e.target.value)}
              />
              {option.label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input
              type="radio"
              name="availability"
              value=""
              checked={!availability}
              onChange={() => setAvailability("")}
            />
            Any availability
          </label>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor gender</p>
        <div className="mt-2 space-y-2">
          {genderOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="gender"
                value={option.value}
                checked={gender === option.value}
                onChange={(e) => setGender(e.target.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</p>
        <div className="mt-2 space-y-2">
          {experienceOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="experience"
                value={option.value}
                checked={experience === option.value}
                onChange={(e) => setExperience(e.target.value)}
              />
              {option.label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input
              type="radio"
              name="experience"
              value=""
              checked={!experience}
              onChange={() => setExperience("")}
            />
            Any experience
          </label>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Languages</p>
        <div className="mt-2 flex flex-col gap-2">
          {languageOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={option.value}
                checked={languageFilters.includes(option.value)}
                onChange={(e) => {
                  setLanguageFilters((prev) => {
                    if (e.target.checked) {
                      if (prev.includes(option.value)) return prev;
                      return [...prev, option.value];
                    }
                    return prev.filter((lang) => lang !== option.value);
                  });
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        onClick={() => {
          setAvailability("");
          setGender("any");
          setExperience("");
          setLanguageFilters([]);
          setProviderFilter([]);
        }}
      >
        Clear filters
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,_1fr)]">
      <div>{filterSidebar}</div>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700">Specialty</label>
              <select
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="all">All specialties</option>
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1" ref={providerDropdownRef}>
              <label className="block text-sm font-semibold text-slate-700">Doctors</label>
              <button
                type="button"
                onClick={() => setProviderDropdownOpen((prev) => !prev)}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-left text-slate-900"
              >
                <span>
                  {providerFilter.length
                    ? `${providerFilter.length} doctor${providerFilter.length > 1 ? "s" : ""} selected`
                    : "All doctors"}
                </span>
                <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {providerDropdownOpen && (
                <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs uppercase tracking-wide text-slate-500">
                    <span>Select doctors</span>
                    {providerFilter.length > 0 && (
                      <button
                        type="button"
                        className="text-sky-600 hover:underline"
                        onClick={() => setProviderFilter([])}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 text-sm text-slate-700">
                    {providerOptions.length ? (
                      providerOptions.map((option) => (
                        <label key={option.id} className="flex cursor-pointer items-center gap-2 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={providerFilter.includes(option.id)}
                            onChange={(e) => {
                              setProviderFilter((prev) => {
                                if (e.target.checked) {
                                  if (prev.includes(option.id)) return prev;
                                  return [...prev, option.id];
                                }
                                return prev.filter((id) => id !== option.id);
                              });
                            }}
                          />
                          {option.name}
                        </label>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-slate-500">No doctors available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {successMessage && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">{filteredProviderCount}</span> doctor
              {filteredProviderCount === 1 ? "" : "s"} with upcoming slots
            </div>
            <div>
              Selected slots: <span className="font-semibold text-slate-900">{totalSelected}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              {Object.entries(selectedSummary).map(([name, count]) => (
                <span key={name}>
                  {name}: {count}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
              Loading doctors…
            </p>
          ) : filteredProviderCount ? (
            <div className="space-y-6">
              {filteredProviders.map((provider) => (
                <div key={provider.id} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{provider.name}</p>
                      <p className="text-sm text-slate-500">{provider.speciality || "General practice"}</p>
                      {provider.languages.length > 0 && (
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Languages: {provider.languages.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      <p>
                        Slots available:{" "}
                        <span className="font-semibold text-slate-900">{provider.slots.length}</span>
                      </p>
                      {formatFee(provider.defaultFeePaise) && <p>Fee: {formatFee(provider.defaultFeePaise)}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50"
                          onClick={() => handleSelectAll(provider)}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50"
                          onClick={() => handleClearProvider(provider)}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.slots.map((slot) => {
                      const checked = Boolean(selectedSlots[slot.id]);
                      return (
                        <label
                          key={slot.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                            checked
                              ? "border-sky-400 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) => toggleSlot(provider, slot, e.target.checked)}
                          />
                          <span>{formatSlotLabel(slot.startsAt)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
              No doctors match the selected filters.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-4">
          <div className="text-sm text-slate-600">
            {totalSelected > 0
              ? `You’re holding ${totalSelected} slot${totalSelected > 1 ? "s" : ""}.`
              : "Select one or more slots to reserve them for your NGO drive."}
          </div>
          <button
            type="button"
            onClick={handleReserve}
            disabled={!totalSelected || saving}
            className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Saving…" : `Reserve ${totalSelected || ""} slots`}
          </button>
        </div>
      </div>
    </div>
  );
}
