"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CONSENT_TEXT =
  "I confirm that I have read the CalDoc disclaimer and consent to receiving medical advice via telemedicine.";

type SlotInfo = {
  id: string;
  startsAt: string;
  feePaise?: number;
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

const BOOKING_PROGRESS_STEPS = [
  { key: "provider", label: "Select provider" },
  { key: "slot", label: "Select booking slot" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Confirmation" },
] as const;

function BookingStatusBar({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Appointment booking</p>
      <div className="mt-2 flex items-center gap-4">
        {BOOKING_PROGRESS_STEPS.map((progress, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          return (
            <Fragment key={progress.key}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-400"
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <p
                    className={`text-xs font-medium ${
                      isActive ? "text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {progress.label}
                  </p>
                </div>
              </div>
              {idx < BOOKING_PROGRESS_STEPS.length - 1 && (
                <div className="flex-1 border-t border-dashed border-slate-200" aria-hidden="true" />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function BookClient({ provider, slots, initialSlotId }: Props) {
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

  const pageSize = 6;
  const pagedSlots = upcomingSlots.slice(slotIndex, slotIndex + pageSize);
  const canPrev = slotIndex > 0;
  const canNext = slotIndex + pageSize < upcomingSlots.length;

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

  async function handleSlotContinue() {
    if (!selectedSlot || !patientName.trim() || !patientPhone.trim()) {
      setError("Select a slot and enter your name as well as mobile number.");
      return;
    }
    if (!consentAccepted) {
      setError("Please accept the telemedicine consent to continue.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          slotId: selectedSlot,
          name: patientName.trim(),
          phone: patientPhone.trim(),
          notes: notes.trim() || undefined,
          consentText: CONSENT_TEXT,
          visitMode,
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
    setStep("pay");
  }

  function handleBack(target: Step) {
    setStep(target);
  }

  const deliverySummary =
    deliveryOpt === "PHONE"
      ? "Prescription will be shared to the patient phone/WhatsApp."
      : `${address.contactName || patientName} · ${address.line1 || "No address"}`;

  const progressIndex = { slot: 1, delivery: 1, pay: 2 }[step] ?? 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <BookingStatusBar currentIndex={progressIndex} />
      <Link
        href="/providers"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to doctors
      </Link>
      <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm">
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">Book {provider.name}</h1>
          <span className="text-sm text-slate-500">{provider.speciality}</span>
          {provider.qualification && <span className="text-sm text-slate-400">· {provider.qualification}</span>}
        </div>
        {provider.registrationNumber && (
          <p className="mt-1 text-xs text-slate-500">
            Reg. No: <span className="font-mono text-slate-900">{provider.registrationNumber}</span>
            {provider.councilName && <> ({provider.councilName})</>}
          </p>
        )}
      </div>
      {step === "slot" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="space-y-2">
            <p className="text-xs uppercase text-slate-500">Step 2</p>
            <h2 className="text-xl font-semibold text-slate-900">Choose a slot</h2>
            <p className="text-sm text-slate-500">
              Select a time, enter the patient details, and accept the telemedicine consent.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePage("prev")}
                  disabled={!canPrev}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                  &lt;
                </button>
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
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

              <label className="text-sm font-medium text-slate-700">
                Notes for doctor (optional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  placeholder="Symptoms, duration, or remarks"
                />
              </label>

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>

            <aside className="space-y-4 w-full lg:w-auto">
              <div className="rounded-3xl border border-blue-100 bg-blue-50/40 p-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Patient details</p>
                <div className="mt-3 space-y-4">
                  <label className="text-sm font-medium text-slate-700">
                    Patient full name
                    <input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Mobile number
                    <input
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                      placeholder="+91 98765 43210"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-700 shadow-inner">
                <p className="font-semibold text-blue-900">Connection preference</p>
                <p className="mt-1 text-xs text-blue-700">
                  Inspired by eSanjeevani&apos;s rural workflows, choose audio-only if you expect limited bandwidth or
                  need to dial in via phone.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    className={`inline-flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      visitMode === "VIDEO"
                        ? "border-blue-400 bg-white text-blue-900 shadow"
                        : "border-blue-100 bg-white text-slate-700"
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
                        ? "border-blue-400 bg-white text-blue-900 shadow"
                        : "border-blue-100 bg-white text-slate-700"
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
                {visitMode === "AUDIO" && (
                  <p className="mt-2 text-xs text-amber-600">
                    We will share dial-in details and the provider may call you at the registered phone number.
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    {CONSENT_TEXT} Read our{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("disclaimer")}
                      className="text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline"
                    >
                      disclaimer
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("terms")}
                      className="text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline"
                    >
                      terms of service
                    </button>
                    .
                  </span>
                </label>
              </div>
            </aside>
          </div>
          <div className="mt-6 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSlotContinue}
              disabled={loading}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Locking slot..." : "Continue"}
            </button>
          </div>
        </section>
      )}

      {step === "delivery" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Step 2</p>
              <h2 className="text-xl font-semibold text-slate-900">Prescription delivery preference</h2>
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

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
                onClick={() => handleBack("slot")}
              >
                ← Back to slots
              </button>
              <button
                type="button"
                onClick={handleDeliveryContinue}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue to payment
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "pay" && appointmentId && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Step 3</p>
              <h2 className="text-xl font-semibold text-slate-900">Payment & confirmation</h2>
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
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => {
                  const amountQuery = amount ? `&amount=${amount}` : "";
                  window.location.href = `/checkout?appointmentId=${appointmentId}${amountQuery}`;
                }}
              >
                Proceed to payment
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "pay" && !appointmentId && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
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
              src={policyModal === "terms" ? "/terms" : "/disclaimer"}
              className="h-[60vh] w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
