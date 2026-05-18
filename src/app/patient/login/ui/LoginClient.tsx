"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const OTP_COOLDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_PATIENT_OTP_COOLDOWN ?? "60");

type Mode = "signin" | "signup";

type Props = {
  next: string;
  initialPhone?: string;
};

export default function LoginClient({ next, initialPhone }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [phone, setPhone] = useState(initialPhone || "");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [prefillRequested, setPrefillRequested] = useState(false);

  // Sign-up basic details
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"Male" | "Female" | "">("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function resetError() {
    setError(null);
    setStatus(null);
  }

  function resetToDetails() {
    setStep("details");
    setOtp("");
    resetError();
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || cooldown > 0) return;
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setLoading(true);
    resetError();
    try {
      const res = await fetch("/api/patient/login/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to send OTP");
      if (data.skip && data.redirect) {
        router.push(data.redirect);
        startTransition(() => router.refresh());
        return;
      }
      setStep("otp");
      setStatus(
        data.masked
          ? `OTP sent via SMS to ${data.masked} (${data.ttlMinutes || 5} min validity)`
          : "We sent a 6-digit code to your mobile."
      );
      setCooldown(Number(data.cooldown || OTP_COOLDOWN_SECONDS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    resetError();
    try {
      const res = await fetch("/api/patient/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          next,
          ...(mode === "signup"
            ? { name: name.trim(), dob: dob || undefined, sex: sex || undefined }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invalid code");
      router.push(data.redirect || next);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialPhone) return;
    setPhone(initialPhone);
  }, [initialPhone]);

  // Auto-send OTP when a phone is prefilled (sign-in only).
  useEffect(() => {
    if (mode !== "signin" || !initialPhone || prefillRequested || step !== "details" || !phone)
      return;
    setPrefillRequested(true);
    requestOtp().catch(() => setPrefillRequested(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone, phone, prefillRequested, step, mode]);

  function switchMode(m: Mode) {
    setMode(m);
    resetError();
    setStep("details");
    setOtp("");
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  return (
    <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
      <div className="space-y-1 text-center mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Patient portal
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {mode === "signin" ? "Sign in to view your visits" : "Create your account"}
        </h2>
      </div>

      {/* Sign in / Sign up toggle */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button
          onClick={() => switchMode("signin")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            mode === "signin" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Sign in
        </button>
        <button
          onClick={() => switchMode("signup")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            mode === "signup" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Sign up
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {status && !error && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {status}
        </div>
      )}

      <p className="text-sm text-slate-500 text-center mb-4">
        {step === "otp"
          ? "Enter the code we sent to your mobile."
          : mode === "signin"
          ? "Enter your number with country code to get an OTP via SMS."
          : "Tell us a few basic details — we'll verify your mobile with an OTP."}
      </p>

      {step === "otp" && (
        <div className="text-center mb-2">
          <button
            onClick={resetToDetails}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {mode === "signin" ? "Change number" : "Edit details"}
          </button>
        </div>
      )}

      {step === "details" ? (
        <form className="space-y-4" onSubmit={requestOtp}>
          {mode === "signup" && (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  autoComplete="name"
                  className={inputCls}
                  placeholder="Priya Sharma"
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Date of birth
                  <input
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    className={inputCls}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Sex
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as "Male" | "Female" | "")}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>
              </div>
            </>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Mobile number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              autoComplete="tel"
              className={inputCls}
              placeholder="+91 98765 43210"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={verifyOtp}>
          <label className="block text-sm font-medium text-slate-700">
            6-digit code
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tracking-[0.3em] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="••••••"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading
              ? "Verifying…"
              : mode === "signup"
              ? "Verify & create account"
              : "Verify & continue"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-slate-500">
        By continuing you agree to our privacy policy and terms. TELEMEDICINE services are not for
        emergency care.
      </p>
    </div>
  );
}
