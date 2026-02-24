"use client";

import Link from "next/link";
import { useMemo, useRef, useTransition } from "react";
import type { ReactNode } from "react";

const availabilityOptions = [
  { value: "next30", label: "Available in next 30 mins" },
  { value: "today", label: "Available today" },
  { value: "week", label: "Available this week" },
];

const genderOptions = [
  { value: "female", label: "Female doctors" },
  { value: "male", label: "Male doctors" },
  { value: "any", label: "Any" },
];

const experienceOptions = [
  { value: "lt5", label: "0 – 5 years" },
  { value: "btw5and10", label: "5 – 10 years" },
  { value: "gt10", label: "10+ years" },
];

const consultationTypeOptions = [
  { value: "audio", label: "Audio call" },
  { value: "video", label: "Video call" },
];

type FiltersPanelProps = {
  specialtyList: string[];
  selectedSpecialties: string[];
  selectedAvailability: string;
  selectedExperience: string;
  selectedGenders: string[];
  genderAnySelected: boolean;
  selectedLanguages: string[];
  selectedConsultationTypes: string[];
  q: string;
  languageLabels: Record<string, string>;
  patientName?: string;
  patientPhone?: string;
  embed?: string;
};

export function FiltersPanel({
  specialtyList,
  selectedSpecialties,
  selectedAvailability,
  selectedExperience,
  selectedGenders,
  genderAnySelected,
  selectedLanguages,
  selectedConsultationTypes,
  q,
  languageLabels,
  patientName,
  patientPhone,
  embed,
}: FiltersPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const specialtySet = useMemo(() => new Set(selectedSpecialties), [selectedSpecialties]);
  const genderSet = useMemo(() => new Set(selectedGenders), [selectedGenders]);
  const languageSet = useMemo(() => new Set(selectedLanguages), [selectedLanguages]);
  const consultationTypeSet = useMemo(() => new Set(selectedConsultationTypes), [selectedConsultationTypes]);
  const languagesList = useMemo(
    () => Object.entries(languageLabels).map(([value, label]) => ({ value, label })),
    [languageLabels],
  );

  function handleChange() {
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <aside
      className={`w-full shrink-0 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)] backdrop-blur-sm lg:sticky lg:top-4 lg:w-64 ${
        isPending ? "opacity-70" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">Filters</span>
        <Link href="/providers" className="text-xs font-semibold text-rose-400 hover:text-rose-600">
          Clear all
        </Link>
      </div>
      <form
        ref={formRef}
        method="GET"
        className="space-y-6"
        onChange={handleChange}
      >
        {q && <input type="hidden" name="q" value={q} />}
        {patientName && <input type="hidden" name="patientName" value={patientName} />}
        {patientPhone && <input type="hidden" name="patientPhone" value={patientPhone} />}
        {embed && <input type="hidden" name="embed" value={embed} />}

        <FilterGroup title="Availability">
          <div className="space-y-2">
            {availabilityOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="radio"
                  name="availability"
                  value={option.value}
                  defaultChecked={selectedAvailability === option.value}
                  className="h-4 w-4 accent-[#2f6ea5] border-slate-300"
                />
                {option.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <input
                type="radio"
                name="availability"
                value=""
                defaultChecked={!selectedAvailability}
                className="h-4 w-4 accent-[#2f6ea5] border-slate-300"
              />
              Any time
            </label>
          </div>
        </FilterGroup>

        <FilterGroup title="Consultation Type">
          <div className="space-y-2 text-sm">
            {consultationTypeOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  name="consultationType"
                  value={option.value}
                  defaultChecked={consultationTypeSet.has(option.value)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Specialty">
          <div className="max-h-48 space-y-2 overflow-y-auto pr-2 text-sm">
            {specialtyList.map((spec) => (
              <label key={spec} className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  name="specialty"
                  value={spec}
                  defaultChecked={specialtySet.has(spec)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {spec}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Gender">
          <div className="space-y-2 text-sm">
            {genderOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  name="gender"
                  value={option.value}
                  defaultChecked={
                    option.value === "any"
                      ? genderAnySelected
                      : genderSet.has(option.value)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Languages">
          <div className="max-h-32 space-y-2 overflow-y-auto pr-2 text-sm">
            {languagesList.map((lang) => (
              <label key={lang.value} className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  name="languages"
                  value={lang.value}
                  defaultChecked={languageSet.has(lang.value)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {lang.label}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Experience">
          <div className="space-y-2 text-sm">
            {experienceOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-slate-600">
                <input
                  type="radio"
                  name="experience"
                  value={option.value}
                  defaultChecked={selectedExperience === option.value}
                  className="h-4 w-4 accent-[#2f6ea5] border-slate-300"
                />
                {option.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <input
                type="radio"
                name="experience"
                value=""
                defaultChecked={!selectedExperience}
                className="h-4 w-4 accent-[#2f6ea5] border-slate-300"
              />
              Any experience
            </label>
          </div>
        </FilterGroup>
      </form>
    </aside>
  );
}

type FilterGroupProps = {
  title: string;
  children: React.ReactNode;
};

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <section className="rounded-2xl border border-[#e7e0d5]/60 bg-[#f7f2ea]/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}
