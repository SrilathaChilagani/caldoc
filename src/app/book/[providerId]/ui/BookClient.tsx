"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CONSENT_TEXT =
  "I confirm that I have read the CalDoc disclaimer and consent to receiving medical advice via telemedicine.";

type SlotInfo = {
  id: string;
  startsAt: string;
  feePaise?: number;
};

const SYMPTOM_OPTIONS = ["Fever", "Headache", "Dizziness", "Chest pain", "Sore throat", "Cough", "Cold"];

type Props = {
  provider: {
    id: string;
    name: string;
    speciality: string;
    qualification?: string | null;
    registrationNumber?: string | null;
    councilName?: string | null;
    defaultFeePaise?: number | null;
  };
  slots: SlotInfo[];
  initialSlotId?: string;
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

function formatFeeFromPaise(paise?: number | null) {
  if (typeof paise !== "number" || Number.isNaN(paise) || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export default function BookClient({ provider, slots, initialSlotId }: Props) {
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
  const [visitMode, setVisitMode] = useState<"VIDEO" | "AUDIO">("VIDEO");
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 sm:px-4">
      <Link
        href="/providers"
        className="inline-flex items-center text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
      >
        ← Back to doctors
      </Link>
      {step === "slot" && (
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-slate-900">
              Book {provider.name}
              <span className="text-sm font-normal text-slate-500"> · {provider.speciality}</span>
            </h2>
            {provider.qualification && (
              <p className="text-sm text-slate-500">{provider.qualification}</p>
            )}
            {provider.registrationNumber && (
              <p className="text-xs text-slate-500">
                Reg. No: <span className="font-mono text-slate-900">{provider.registrationNumber}</span>
                {provider.councilName && <> ({provider.councilName})</>}
              </p>
            )}
            <p className="text-sm text-slate-500">
              Select a slot, enter patient details, and accept the telemedicine consent to continue.
            </p>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(360px,1fr)]">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handlePage("prev")}
                  disabled={!canPrev}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                  &lt;
                </button>
                <div className="grid flex-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {upcomingSlots.length === 0 && (
                    <p className="text-sm text-slate-500">No slots available right now. Please check back later.</p>
                  )}
                  {upcomingSlots.length > 0 &&
                    (pagedSlots.length ? pagedSlots : upcomingSlots).map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                          selectedSlot === slot.id
                            ? "bg-slate-800 text-white shadow"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {formatSlotLabel(slot.startsAt)}
                        <span className="mt-2 block text-xs font-semibold">
                          {formatFeeFromPaise(slot.feePaise ?? provider.defaultFeePaise) ?? "Fee TBD"}
                        </span>
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => handlePage("next")}
                  disabled={!canNext}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                  &gt;
                </button>
              </div>

              <div className="rounded-3xl border border-[#2f6ea5]/20 bg-[#e7edf3] p-4 shadow-inner space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">Patient details</p>

                {/* Booking-for toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${bookingFor === "self" ? "border-[#2f6ea5] bg-white text-[#1e4d77] shadow" : "border-[#2f6ea5]/20 bg-white/60 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="bookingFor"
                      value="self"
                      checked={bookingFor === "self"}
                      onChange={() => { setBookingFor("self"); setBookerPhone(""); }}
                      className="accent-[#2f6ea5]"
                    />
                    Booking for myself
                  </label>
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${bookingFor === "other" ? "border-[#2f6ea5] bg-white text-[#1e4d77] shadow" : "border-[#2f6ea5]/20 bg-white/60 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="bookingFor"
                      value="other"
                      checked={bookingFor === "other"}
                      onChange={() => setBookingFor("other")}
                      className="accent-[#2f6ea5]"
                    />
                    Booking for someone else
                  </label>
                </div>

                {/* Patient name + phone */}
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    {bookingFor === "other" ? "Patient's full name" : "Full name"}
                    <input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#2f6ea5]/20 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {bookingFor === "other" ? "Patient's mobile number" : "Mobile number"}
                    <input
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#2f6ea5]/20 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
                      placeholder="+91 98765 43210"
                    />
                  </label>
                </div>

                {/* Booker phone — only shown when booking for someone else */}
                {bookingFor === "other" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Your mobile number
                      <span className="ml-1 text-xs font-normal text-slate-400">(optional — you'll also receive confirmation here)</span>
                      <input
                        value={bookerPhone}
                        onChange={(e) => setBookerPhone(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-[#2f6ea5]/20 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
                        placeholder="+91 98765 43210"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[#2f6ea5]/20 bg-[#e7edf3] p-4 text-sm text-slate-700 shadow-inner">
                <p className="font-semibold text-[#2f6ea5]">Connection preference</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label
                    className={`inline-flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      visitMode === "VIDEO"
                        ? "border-[#2f6ea5] bg-white text-[#1e4d77] shadow"
                        : "border-[#2f6ea5]/20 bg-white text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visitMode"
                      value="VIDEO"
                      checked={visitMode === "VIDEO"}
                      onChange={() => setVisitMode("VIDEO")}
                    />
                    Video call (default)
                  </label>
                  <label
                    className={`inline-flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      visitMode === "AUDIO"
                        ? "border-[#2f6ea5] bg-white text-[#1e4d77] shadow"
                        : "border-[#2f6ea5]/20 bg-white text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visitMode"
                      value="AUDIO"
                      checked={visitMode === "AUDIO"}
                      onChange={() => setVisitMode("AUDIO")}
                    />
                    Audio-only call
                  </label>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <span>
                    {CONSENT_TEXT} Read our{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("disclaimer")}
                      className="text-[#2f6ea5] underline-offset-2 hover:text-[#255b8b] hover:underline"
                    >
                      disclaimer
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("terms")}
                      className="text-[#2f6ea5] underline-offset-2 hover:text-[#255b8b] hover:underline"
                    >
                      terms of service
                    </button>
                    .
                  </span>
                </label>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>

            <aside className="space-y-4 w-full lg:w-auto">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Common symptoms</p>
                <p className="text-xs text-slate-500">Select all that apply so the doctor can prepare.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SYMPTOM_OPTIONS.map((symptom) => {
                    const isActive = selectedSymptoms.includes(symptom);
                    return (
                      <label
                        key={symptom}
                        className={`inline-flex items-center rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                          isActive ? "border-[#2f6ea5] bg-[#e7edf3] text-[#1e4d77]" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleSymptom(symptom)}
                          className="mr-2 rounded border-slate-300"
                        />
                        {symptom}
                      </label>
                    );
                  })}
                  <label
                    className={`inline-flex flex-col rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                      selectedSymptoms.includes("Other")
                        ? "border-[#2f6ea5] bg-[#e7edf3] text-[#1e4d77]"
                        : "border-slate-200 text-slate-600"
                    } sm:col-span-2`}
                  >
                    <span className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes("Other")}
                        onChange={() => toggleSymptom("Other")}
                        className="mr-2 rounded border-slate-300"
                      />
                      Other
                    </span>
                    {selectedSymptoms.includes("Other") && (
                      <input
                        value={otherSymptom}
                        onChange={(e) => setOtherSymptom(e.target.value)}
                        placeholder="Describe other symptoms"
                        className="mt-2 w-full rounded-xl border border-[#2f6ea5]/20 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/10"
                      />
                    )}
                  </label>
                </div>
              </div>
              <label className="text-sm font-medium text-slate-700 block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                Notes for doctor (optional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={10}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  placeholder="Symptoms, duration, or remarks"
                />
              </label>
            </aside>
          </div>
          <div className="mt-6 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSlotContinue}
              disabled={loading}
              className="inline-flex items-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
            >
              {loading ? "Locking slot..." : "Continue"}
            </button>
          </div>
        </section>
      )}

      {step === "delivery" && (
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
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
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
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
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
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
