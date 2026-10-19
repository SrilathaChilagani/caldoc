"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TestEntry = {
  name: string;
  fasting: boolean;
  fastingHours?: number;
  sampleType: string;
  prepInstructions: string;
  homeCollectionOk: boolean;
};

type Props = {
  appointmentId: string;
  labOrderId: string;
  tests: TestEntry[];
  patientAddress: { line1: string; city: string; state: string; postalCode: string } | null;
};

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) break;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

// Minimum date: tomorrow (IST)
function minDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}

// Maximum date: 14 days out
function maxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function ScheduleLabsForm({ appointmentId, labOrderId, tests, patientAddress }: Props) {
  const router = useRouter();
  const [collectionType, setCollectionType] = useState<"HOME" | "WALK_IN">("HOME");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [address, setAddress] = useState({
    line1: patientAddress?.line1 ?? "",
    line2: "",
    city: patientAddress?.city ?? "",
    state: patientAddress?.state ?? "",
    postalCode: patientAddress?.postalCode ?? "",
  });
  const [scheduleNote, setScheduleNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fastingTests = tests.filter((t) => t.fasting);
  const maxFasting = fastingTests.reduce((m, t) => Math.max(m, t.fastingHours ?? 8), 0);
  const anyHomeBlocked = collectionType === "HOME" && tests.some((t) => !t.homeCollectionOk);

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) { setError("Please pick a date and time."); return; }

    // Build a UTC ISO string from IST date + time
    const istString = `${date}T${time}:00+05:30`;
    const scheduledFor = new Date(istString).toISOString();

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patient/appointments/${appointmentId}/schedule-labs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labOrderId,
            collectionType,
            scheduledFor,
            scheduleNote: scheduleNote || undefined,
            address: collectionType === "HOME" ? address : undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not schedule collection");
      router.push(`/patient/lab-orders/${labOrderId}?scheduled=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prep instructions */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <h2 className="font-serif text-lg text-slate-900">Before your tests</h2>
        <div className="mt-4 space-y-3">
          {tests.map((test, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{test.name}</p>
              <p className="mt-1 text-xs text-slate-600">{test.prepInstructions}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${test.fasting ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {test.fasting ? `Fasting ${test.fastingHours ?? 8}h` : "No fasting"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                  {test.sampleType} sample
                </span>
                {!test.homeCollectionOk && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 font-semibold">
                    Walk-in only
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {fastingTests.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Fasting reminder:</strong> Please fast for at least {maxFasting} hours before your collection. Water is fine. If you take regular medication, ask your doctor whether to take it before the blood draw.
          </div>
        )}
      </section>

      {/* Collection type */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <h2 className="font-serif text-lg text-slate-900">Collection method</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <label className={`flex flex-1 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${collectionType === "HOME" ? "border-[#2f6ea5] bg-[#f0f5fa]" : "border-slate-200"}`}>
            <input type="radio" name="collectionType" value="HOME" checked={collectionType === "HOME"} onChange={() => setCollectionType("HOME")} className="mt-0.5 accent-[#2f6ea5]" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Home collection</p>
              <p className="text-xs text-slate-500">Our phlebotomist visits you at home or your office.</p>
            </div>
          </label>
          <label className={`flex flex-1 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${collectionType === "WALK_IN" ? "border-[#2f6ea5] bg-[#f0f5fa]" : "border-slate-200"}`}>
            <input type="radio" name="collectionType" value="WALK_IN" checked={collectionType === "WALK_IN"} onChange={() => setCollectionType("WALK_IN")} className="mt-0.5 accent-[#2f6ea5]" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Walk-in at lab</p>
              <p className="text-xs text-slate-500">Visit the partner lab at your scheduled time.</p>
            </div>
          </label>
        </div>

        {anyHomeBlocked && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            One or more tests are not available for home collection. Please choose Walk-in.
          </p>
        )}
      </section>

      {/* Date and time */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <h2 className="font-serif text-lg text-slate-900">Preferred date & time</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              min={minDate()}
              max={maxDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Preferred time (IST) <span className="text-rose-500">*</span>
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            >
              {TIME_SLOTS.map((slot) => {
                const [h, m] = slot.split(":").map(Number);
                const ampm = h < 12 ? "AM" : "PM";
                const h12 = h % 12 || 12;
                return (
                  <option key={slot} value={slot}>
                    {h12}:{m === 0 ? "00" : m} {ampm}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          The lab team will confirm or suggest an alternative time via WhatsApp.
        </p>
      </section>

      {/* Home address */}
      {collectionType === "HOME" && (
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
          <h2 className="font-serif text-lg text-slate-900">Collection address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Street address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required={collectionType === "HOME"}
                value={address.line1}
                onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                className={inputCls}
                placeholder="House / flat / street"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Landmark / area <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={address.line2}
                onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                className={inputCls}
                placeholder="Colony, landmark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required={collectionType === "HOME"}
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required={collectionType === "HOME"}
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                PIN code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required={collectionType === "HOME"}
                pattern="[0-9]{6}"
                value={address.postalCode}
                onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                className={inputCls}
                placeholder="6-digit PIN"
              />
            </div>
          </div>
        </section>
      )}

      {/* Notes */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6">
        <label className="block text-sm font-medium text-slate-700">
          Notes for the lab <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={scheduleNote}
          onChange={(e) => setScheduleNote(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#2f6ea5] focus:outline-none resize-none"
          placeholder="Any access instructions, gate codes, or health conditions the phlebotomist should know about"
        />
      </section>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
      >
        {loading ? "Scheduling…" : "Confirm collection schedule →"}
      </button>
    </form>
  );
}
