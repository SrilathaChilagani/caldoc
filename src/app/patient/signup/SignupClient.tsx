"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const OTP_COOLDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_PATIENT_OTP_COOLDOWN ?? "60");

export default function SignupClient() {
  const router = useRouter();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"Male" | "Female" | "">("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/patient/login/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to send OTP");
      if (data.skip && data.redirect) {
        router.push(data.redirect);
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
    setError(null);
    try {
      const res = await fetch("/api/patient/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          name: name.trim(),
          dob: dob || undefined,
          sex: sex || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invalid code");
      router.push(data.redirect || "/patient/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Create an account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/patient/login" className="font-medium text-[#2f6ea5] hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {status && !error && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {status}
        </div>
      )}

      {step === "details" ? (
        <form onSubmit={sendOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
              className={inputCls}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={inputCls}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-400">Include country code, e.g. +91 for India</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date of birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={inputCls}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "Male" | "Female" | "")}
                className={inputCls}
                disabled={loading}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="mt-2 w-full rounded-xl bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60 transition-colors"
          >
            {loading ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
          </button>

          <p className="text-center text-xs text-slate-400">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-600">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-slate-600">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-5">
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setOtp("");
              setError(null);
            }}
            className="text-xs font-medium text-[#2f6ea5] hover:underline"
          >
            ← Edit details
          </button>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">6-digit code</label>
            <input
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="••••••"
              className={`${inputCls} tracking-[0.3em]`}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#2f6ea5] py-3 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60 transition-colors"
          >
            {loading ? "Verifying…" : "Verify & create account"}
          </button>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5] disabled:bg-slate-50";
