"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CONSENT_TEXT =
  "I confirm that I have read the disclaimer and terms, understand that this is a telemedicine consultation with limitations that may not replace in-person care, consent to a teleconsultation with a registered medical practitioner (NMC/State Medical Council registered), and acknowledge that Schedule X controlled drugs cannot be prescribed via telemedicine.";

type SlotInfo = {
  id: string;
  startsAt: string;
  feePaise?: number;
};

const SYMPTOM_OPTIONS = ["Fever", "Headache", "Dizziness", "Chest pain", "Sore throat", "Cough", "Cold"];

type ClinicInfo = {
  id: string;
  clinicName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  phone?: string | null;
};

type Props = {
  provider: {
    id: string;
    name: string;
    speciality: string;
    qualification?: string | null;
    registrationNumber?: string | null;
    councilName?: string | null;
    defaultFeePaise?: number | null;
    visitModes?: string[];
    clinics?: ClinicInfo[];
  };
  slots: SlotInfo[];
  initialSlotId?: string;
  initialMode?: "VIDEO" | "AUDIO" | "IN_PERSON";
};

type Step = "slot" | "delivery" | "pay";

type DeliveryForm = {
  contactName: string;
  contactPhone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  instructions: string;
};

function formatSlotLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSlotDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatSlotTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFeeFromPaise(paise?: number | null) {
  if (typeof paise !== "number" || Number.isNaN(paise) || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export default function BookClient({ provider, slots, initialSlotId, initialMode }: Props) {
  const searchParams = useSearchParams();
  const prefillName = (searchParams.get("patientName") || "").trim();
  const prefillPhone = (searchParams.get("patientPhone") || "").trim();
  const embedParam = (searchParams.get("embed") || "").trim();
  const isEmbed = embedParam === "1" || embedParam === "true";
  const [step, setStep] = useState<Step>("slot");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slotIndex, setSlotIndex] = useState(0);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const hasInPerson = (provider.clinics?.length ?? 0) > 0;
  const [visitMode, setVisitMode] = useState<"VIDEO" | "AUDIO" | "IN_PERSON">(
    initialMode ?? (hasInPerson && !provider.visitModes?.includes("VIDEO") ? "IN_PERSON" : "VIDEO")
  );
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deliveryOpt, setDeliveryOpt] = useState<"PHONE" | "DELIVERY">("PHONE");
  const [policyModal, setPolicyModal] = useState<null | "disclaimer" | "terms">(null);
  const [bookingFor, setBookingFor] = useState<"self" | "other">("self");
  const [bookerPhone, setBookerPhone] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState("");
  const [address, setAddress] = useState<DeliveryForm>({
    contactName: "",
    contactPhone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    instructions: "",
  });

  const upcomingSlots = useMemo(
    () =>
      slots.filter((slot) => {
        const slotStart = new Date(slot.startsAt).getTime();
        return slotStart >= Date.now();
      }),
    [slots],
  );

  useEffect(() => {
    if (initialSlotId && upcomingSlots.some((slot) => slot.id === initialSlotId)) {
      setSelectedSlot(initialSlotId);
    } else if (!selectedSlot && upcomingSlots.length) {
      setSelectedSlot(upcomingSlots[0].id);
    } else if (selectedSlot && !upcomingSlots.some((slot) => slot.id === selectedSlot)) {
      setSelectedSlot(upcomingSlots[0]?.id || "");
    }
  }, [initialSlotId, upcomingSlots, selectedSlot]);

  useEffect(() => {
    if (prefillName && !patientName) {
      setPatientName(prefillName);
    }
  }, [prefillName, patientName]);

  useEffect(() => {
    if (prefillPhone && !patientPhone) {
      setPatientPhone(prefillPhone);
    }
  }, [prefillPhone, patientPhone]);

  const selectedSlotLabel = useMemo(() => {
    const slot = upcomingSlots.find((s) => s.id === selectedSlot);
    return slot ? formatSlotLabel(slot.startsAt) : "";
  }, [upcomingSlots, selectedSlot]);

  const selectedSlotFeePaise = useMemo(() => {
    const slot = upcomingSlots.find((s) => s.id === selectedSlot);
    if (slot?.feePaise && slot.feePaise > 0) return slot.feePaise;
    return provider.defaultFeePaise ?? null;
  }, [upcomingSlots, selectedSlot, provider.defaultFeePaise]);

  const selectedSlotFeeLabel = useMemo(
    () => formatFeeFromPaise(selectedSlotFeePaise),
    [selectedSlotFeePaise],
  );

  const pageSize = 8;
  const pagedSlots = upcomingSlots.slice(slotIndex, slotIndex + pageSize);
  const canPrev = slotIndex > 0;
  const canNext = slotIndex + pageSize < upcomingSlots.length;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [step]);

  function handlePage(direction: "prev" | "next") {
    setSlotIndex((prev) => {
      if (direction === "prev") {
        return Math.max(0, prev - pageSize);
      }
      const next = prev + pageSize;
      const maxStart = Math.max(0, upcomingSlots.length - pageSize);
      return Math.min(maxStart, next);
    });
  }

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) => {
      if (prev.includes(symptom)) {
        if (symptom === "Other") setOtherSymptom("");
        return prev.filter((val) => val !== symptom);
      }
      return [...prev, symptom];
    });
  }

  const compiledSymptoms = useMemo(() => {
    const baseSymptoms = selectedSymptoms.filter((symptom) => symptom !== "Other");
    const extras = selectedSymptoms.includes("Other") && otherSymptom.trim() ? [`Other: ${otherSymptom.trim()}`] : [];
    return [...baseSymptoms, ...extras];
  }, [selectedSymptoms, otherSymptom]);

  async function handleSlotContinue() {
    if (!selectedSlot || !patientName.trim() || !patientPhone.trim()) {
      setError("Select a slot and enter the patient name and mobile number.");
      return;
    }
    if (!consentAccepted) {
      setError("Please accept the telemedicine consent to continue.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const symptomNote = compiledSymptoms.length ? `Symptoms: ${compiledSymptoms.join(", ")}` : "";
      const finalNotes = [symptomNote, notes.trim()].filter(Boolean).join("\n");
      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          slotId: selectedSlot,
          name: patientName.trim(),
          phone: patientPhone.trim(),
          notes: finalNotes || undefined,
          consentText: CONSENT_TEXT,
          visitMode,
          ...(bookingFor === "other" && bookerPhone.trim()
            ? { bookerPhone: bookerPhone.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not create appointment");
      }
      setAppointmentId(data.appointmentId);
      setAmount(data.amount || null);
      setStep("delivery");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleDeliveryContinue() {
    if (deliveryOpt === "DELIVERY") {
      const { contactName, contactPhone, line1, city, state, postalCode } = address;
      if (
        !contactName.trim() ||
        !contactPhone.trim() ||
        !line1.trim() ||
        !city.trim() ||
        !state.trim() ||
        !postalCode.trim()
      ) {
        setError(
          "Please fill in all required delivery fields: contact name, phone, address line 1, city, state, and PIN code."
        );
        return;
      }
      if (!/^\d{6}$/.test(postalCode.trim())) {
        setError("Please enter a valid 6-digit PIN code.");
        return;
      }
    }
    setError(null);
    setStep("pay");
  }

  function handleBack(target: Step) {
    setStep(target);
  }

  const deliverySummary =
    deliveryOpt === "PHONE"
      ? "Prescription will be shared to the patient phone/WhatsApp."
      : `${address.contactName || patientName} · ${address.line1 || "No address"}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
      <Link
        href="/providers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
      >
        ← Back to doctors
      </Link>

      {step === "slot" && (
        <>
          {/* ── Page header — outside any card ──────────────── */}
          <div className="mb-4 mt-3 sm:mb-5 sm:mt-4">
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl lg:text-3xl">
              Book {provider.name}{" "}
              <span className="text-base font-normal text-slate-500">· {provider.speciality}</span>
            </h1>
            {provider.qualification && (
              <p className="text-sm text-slate-500">{provider.qualification}</p>
            )}
            {provider.registrationNumber && (
              <p className="text-xs text-slate-500">
                Reg. No: <span className="font-mono text-slate-900">{provider.registrationNumber}</span>
                {provider.councilName && <> ({provider.councilName})</>}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500">
              Select a slot, enter patient details, and accept the telemedicine consent to continue.
            </p>
          </div>

          {/* ── Two-column layout ────────────────────────────── */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5 lg:gap-6">

            {/* Left column */}
            <div className="flex-1 space-y-4 min-w-0">

              {/* Time slots */}
              <div className="py-2 sm:py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePage("prev")}
                    disabled={!canPrev}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    ‹
                  </button>
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {upcomingSlots.length === 0 && (
                      <p className="col-span-4 text-sm text-slate-500">No slots available right now. Please check back later.</p>
                    )}
                    {(pagedSlots.length ? pagedSlots : upcomingSlots).map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          selectedSlot === slot.id
                            ? "border-[#2f6ea5] bg-[#2f6ea5] shadow-sm"
                            : "border-slate-200 bg-white hover:border-[#2f6ea5]/40"
                        }`}
                      >
                        <p className={`text-sm font-medium ${selectedSlot === slot.id ? "text-white" : "text-slate-900"}`}>
                          {formatSlotDate(slot.startsAt)}
                        </p>
                        <p className={`text-xs ${selectedSlot === slot.id ? "text-white/80" : "text-slate-500"}`}>
                          {formatSlotTime(slot.startsAt)} · {formatFeeFromPaise(slot.feePaise ?? provider.defaultFeePaise) ?? "TBD"}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePage("next")}
                    disabled={!canNext}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Patient Details + Connection Preference */}
              <div className="space-y-6 border-t border-slate-200 pt-6">

                {/* Patient Details */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Patient Details</h3>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${bookingFor === "self" ? "border-[#2f6ea5] bg-[#2f6ea5]/5 text-[#2f6ea5]" : "border-slate-200 bg-white text-slate-600"}`}>
                      <input type="radio" name="bookingFor" value="self" checked={bookingFor === "self"} onChange={() => { setBookingFor("self"); setBookerPhone(""); }} className="accent-[#2f6ea5]" />
                      Myself
                    </label>
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${bookingFor === "other" ? "border-[#2f6ea5] bg-[#2f6ea5]/5 text-[#2f6ea5]" : "border-slate-200 bg-white text-slate-600"}`}>
                      <input type="radio" name="bookingFor" value="other" checked={bookingFor === "other"} onChange={() => setBookingFor("other")} className="accent-[#2f6ea5]" />
                      Someone else
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {bookingFor === "other" ? "Patient full name" : "Patient full name"}
                      </label>
                      <input
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Mobile number</label>
                      <input
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white/50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
                      />
                    </div>
                  </div>
                  {bookingFor === "other" && (
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Your mobile number{" "}
                        <span className="text-xs font-normal text-slate-400">(optional — you'll also receive confirmation here)</span>
                      </label>
                      <input
                        value={bookerPhone}
                        onChange={(e) => setBookerPhone(e.target.value)}
                        placeholder="+91 or +1 for international"
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white/50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
                      />
                    </div>
                  )}
                </div>

                {/* Connection Preference */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Visit Type</h3>
                  <div className={`grid gap-2 ${hasInPerson ? "grid-cols-3" : "grid-cols-2"}`}>
                    <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${visitMode === "VIDEO" ? "border-[#2f6ea5] bg-[#2f6ea5]/5" : "border-slate-200 bg-white hover:border-[#2f6ea5]/40"}`}>
                      <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${visitMode === "VIDEO" ? "border-[#2f6ea5]" : "border-slate-400"}`}>
                        {visitMode === "VIDEO" && <div className="h-1.5 w-1.5 rounded-full bg-[#2f6ea5]" />}
                      </div>
                      <input type="radio" name="visitMode" value="VIDEO" checked={visitMode === "VIDEO"} onChange={() => setVisitMode("VIDEO")} className="sr-only" />
                      <svg className={`h-3.5 w-3.5 ${visitMode === "VIDEO" ? "text-[#2f6ea5]" : "text-slate-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="m22 8-6 4 6 4V8z" /><rect x="2" y="6" width="14" height="12" rx="2" />
                      </svg>
                      <span className={`text-sm ${visitMode === "VIDEO" ? "font-medium text-slate-900" : "text-slate-600"}`}>Video call</span>
                    </label>
                    <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${visitMode === "AUDIO" ? "border-[#2f6ea5] bg-[#2f6ea5]/5" : "border-slate-200 bg-white hover:border-[#2f6ea5]/40"}`}>
                      <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${visitMode === "AUDIO" ? "border-[#2f6ea5]" : "border-slate-400"}`}>
                        {visitMode === "AUDIO" && <div className="h-1.5 w-1.5 rounded-full bg-[#2f6ea5]" />}
                      </div>
                      <input type="radio" name="visitMode" value="AUDIO" checked={visitMode === "AUDIO"} onChange={() => setVisitMode("AUDIO")} className="sr-only" />
                      <svg className={`h-3.5 w-3.5 ${visitMode === "AUDIO" ? "text-[#2f6ea5]" : "text-slate-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.7 12.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className={`text-sm ${visitMode === "AUDIO" ? "font-medium text-slate-900" : "text-slate-600"}`}>Audio-only</span>
                    </label>
                    {hasInPerson && (
                      <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${visitMode === "IN_PERSON" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
                        <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${visitMode === "IN_PERSON" ? "border-emerald-600" : "border-slate-400"}`}>
                          {visitMode === "IN_PERSON" && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                        </div>
                        <input type="radio" name="visitMode" value="IN_PERSON" checked={visitMode === "IN_PERSON"} onChange={() => setVisitMode("IN_PERSON")} className="sr-only" />
                        <svg className={`h-3.5 w-3.5 ${visitMode === "IN_PERSON" ? "text-emerald-600" : "text-slate-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
                        </svg>
                        <span className={`text-sm ${visitMode === "IN_PERSON" ? "font-medium text-slate-900" : "text-slate-600"}`}>In-person</span>
                      </label>
                    )}
                  </div>
                  {/* Clinic address when in-person selected */}
                  {visitMode === "IN_PERSON" && provider.clinics && provider.clinics.length > 0 && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold text-emerald-800 mb-1">Clinic location</p>
                      {provider.clinics.map((c) => (
                        <div key={c.id} className="text-sm text-emerald-900">
                          <p className="font-medium">{c.clinicName}</p>
                          <p className="text-xs text-emerald-700">{c.addressLine1}{c.addressLine2 ? `, ${c.addressLine2}` : ""}</p>
                          <p className="text-xs text-emerald-700">{c.city}, {c.state} – {c.pincode}</p>
                          {c.phone && <p className="text-xs text-emerald-700">📞 {c.phone}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Consent */}
              <div className="border-t border-slate-200 pt-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#2f6ea5]"
                  />
                  <span className="text-xs leading-relaxed text-slate-600">
                    {CONSENT_TEXT} Read our{" "}
                    <button type="button" onClick={() => setPolicyModal("disclaimer")} className="text-[#2f6ea5] hover:underline">
                      disclaimer
                    </button>{" "}
                    and{" "}
                    <button type="button" onClick={() => setPolicyModal("terms")} className="text-[#2f6ea5] hover:underline">
                      terms of service
                    </button>.
                  </span>
                </label>
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>

            {/* Right sidebar */}
            <aside className="shrink-0 space-y-4 md:w-56 lg:w-72 xl:w-84 2xl:w-96">

              {/* Symptoms */}
              <div>
                <p className="text-sm font-semibold text-slate-900">Common symptoms</p>
                <p className="mb-3 text-xs text-slate-500">Select all that apply.</p>
                <div className="grid grid-cols-2 gap-2">
                  {SYMPTOM_OPTIONS.map((symptom) => {
                    const isActive = selectedSymptoms.includes(symptom);
                    return (
                      <label
                        key={symptom}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${
                          isActive ? "border-[#2f6ea5] bg-[#e7edf3] text-[#1e4d77]" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleSymptom(symptom)}
                          className="rounded border-slate-300 accent-[#2f6ea5]"
                        />
                        {symptom}
                      </label>
                    );
                  })}
                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border px-2.5 py-2 text-sm transition col-span-2 ${
                      selectedSymptoms.includes("Other") ? "border-[#2f6ea5] bg-[#e7edf3] text-[#1e4d77]" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes("Other")}
                        onChange={() => toggleSymptom("Other")}
                        className="rounded border-slate-300 accent-[#2f6ea5]"
                      />
                      Other
                    </span>
                    {selectedSymptoms.includes("Other") && (
                      <input
                        value={otherSymptom}
                        onChange={(e) => setOtherSymptom(e.target.value)}
                        placeholder="Describe other symptoms"
                        className="mt-2 w-full rounded-lg border border-[#2f6ea5]/20 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none"
                      />
                    )}
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">Notes (optional)</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Symptoms, duration, or remarks"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]"
                />
              </div>

              {/* Continue */}
              <button
                type="button"
                onClick={handleSlotContinue}
                disabled={loading}
                className="w-full rounded-xl bg-[#2f6ea5] py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#255b8b] disabled:opacity-60"
              >
                {loading ? "Locking slot..." : "Continue"}
              </button>
            </aside>
          </div>
        </>
      )}

      {step === "delivery" && (
        <section className="pt-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-slate-900">Prescription delivery preference</h2>
              <p className="text-sm text-slate-500">
                Choose how you would like to receive the prescription for this appointment.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryOpt === "PHONE"}
                  onChange={() => setDeliveryOpt("PHONE")}
                />
                <div>
                  <p className="font-medium text-slate-900">Send to phone / WhatsApp</p>
                  <p className="text-sm text-slate-500">Prescription link will be shared to the patient mobile number.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryOpt === "DELIVERY"}
                  onChange={() => setDeliveryOpt("DELIVERY")}
                />
                <div className="w-full">
                  <p className="font-medium text-slate-900">Request home delivery</p>
                  <p className="text-sm text-slate-500">Share your address for courier delivery (subject to availability).</p>
                  {deliveryOpt === "DELIVERY" && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        placeholder="Contact name"
                        value={address.contactName}
                        onChange={(e) => setAddress((prev) => ({ ...prev, contactName: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <input
                        placeholder="Phone"
                        value={address.contactPhone}
                        onChange={(e) => setAddress((prev) => ({ ...prev, contactPhone: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <input
                        placeholder="Address line 1"
                        value={address.line1}
                        onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 md:col-span-2"
                      />
                      <input
                        placeholder="Address line 2"
                        value={address.line2}
                        onChange={(e) => setAddress((prev) => ({ ...prev, line2: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 md:col-span-2"
                      />
                      <input
                        placeholder="City"
                        value={address.city}
                        onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <input
                        placeholder="State"
                        value={address.state}
                        onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <input
                        placeholder="PIN code"
                        value={address.postalCode}
                        onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <input
                        placeholder="Instructions (optional)"
                        value={address.instructions}
                        onChange={(e) => setAddress((prev) => ({ ...prev, instructions: e.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 md:col-span-2"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
                onClick={() => { setError(null); handleBack("slot"); }}
              >
                ← Back to slots
              </button>
              <button
                type="button"
                onClick={handleDeliveryContinue}
                className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
              >
                Continue to payment
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "pay" && appointmentId && (
        <section className="pt-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-slate-900">Payment & confirmation</h2>
              <p className="text-sm text-slate-500">
                Review the appointment details before proceeding to Razorpay checkout.
              </p>
            </div>

            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="font-medium text-slate-900">Provider</dt>
                <dd>
                  {provider.name} · {provider.speciality}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Slot</dt>
                <dd>{selectedSlotLabel}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Patient</dt>
                <dd>
                  {patientName}
                  {bookingFor === "other" && (
                    <span className="ml-2 rounded-full bg-[#e7edf3] px-2 py-0.5 text-xs font-semibold text-[#2f6ea5]">
                      booked by you
                    </span>
                  )}
                </dd>
              </div>
              {bookingFor === "other" && bookerPhone.trim() && (
                <div>
                  <dt className="font-medium text-slate-900">Confirmation also to</dt>
                  <dd>{bookerPhone.trim()}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-slate-900">Prescription delivery</dt>
                <dd>{deliverySummary}</dd>
              </div>
              {amount !== null && (
             <div>
               <dt className="font-medium text-slate-900">Amount</dt>
               <dd>₹{(amount / 100).toFixed(2)}</dd>
             </div>
              )}
            </dl>

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
                onClick={() => handleBack("delivery")}
              >
                ← Back to delivery
              </button>
              <button
                type="button"
                className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
                onClick={() => {
                  const amountQuery = amount ? `&amount=${amount}` : "";
                  const embedQuery = isEmbed ? "&embed=1" : "";
                  window.location.href = `/checkout?appointmentId=${appointmentId}${amountQuery}${embedQuery}`;
                }}
              >
                Proceed to payment
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "pay" && !appointmentId && (
        <section className="pt-4">
          <p className="text-sm text-slate-500">Lock a slot first to proceed to payment.</p>
        </section>
      )}

      {policyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {policyModal === "terms" ? "Terms of Service" : "Disclaimer"}
              </h3>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <iframe
              title={policyModal === "terms" ? "Terms of Service" : "Disclaimer"}
              src={`${policyModal === "terms" ? "/terms" : "/disclaimer"}${isEmbed ? "?embed=1" : ""}`}
              className="h-[60vh] w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

