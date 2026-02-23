"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_COPY = "We sent a 6-digit code to your WhatsApp.";
const OTP_COOLDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_PATIENT_OTP_COOLDOWN ?? "60");

type LoginClientProps = {
  next: string;
  initialPhone?: string;
};

export default function LoginClient({ next, initialPhone }: LoginClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(initialPhone || "");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [prefillRequested, setPrefillRequested] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => {
      setCooldown((secs) => (secs > 0 ? secs - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function resetToPhone() {
    setStep("phone");
    setOtp("");
    setStatus(null);
    setError(null);
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || cooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/login/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Unable to send OTP");
      }
      if (data.skip && data.redirect) {
        router.push(data.redirect);
        router.refresh();
        return;
      }
      setStep("otp");
      setStatus(
        data.masked
          ? `OTP sent to ${data.masked} (${data.ttlMinutes || 5} min validity)`
          : DEFAULT_COPY,
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
        body: JSON.stringify({ phone, code: otp, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Invalid code");
      }
      router.push(data.redirect || next);
      router.refresh();
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

  useEffect(() => {
    if (!initialPhone || prefillRequested || step !== "phone" || !phone) return;
    setPrefillRequested(true);
    requestOtp().catch(() => {
      setPrefillRequested(false);
    });
  }, [initialPhone, phone, prefillRequested, step]);

  return (
    <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Patient portal</p>
        <h2 className="text-2xl font-semibold text-slate-900">Sign in to view your visits</h2>
        <p className="text-sm text-slate-500">
          {step === "phone" ? "Enter your number with country code to get a WhatsApp OTP." : "Enter the code we sent on WhatsApp."}
        </p>
      </div>
      {step === "otp" && (
        <div className="mt-2 text-center">
          <button onClick={resetToPhone} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
            Change number
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {status && !error && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {status}
        </div>
      )}

      {step === "phone" ? (
        <form className="mt-6 space-y-4" onSubmit={requestOtp}>
          <label className="text-sm font-medium text-slate-700">
            Mobile number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="+91 98765 43210 or +1 555 123 4567"
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
        <form className="mt-6 space-y-4" onSubmit={verifyOtp}>
          <label className="text-sm font-medium text-slate-700">
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
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-slate-500">
        By continuing you agree to our privacy policy and terms. TELEMEDICINE services are not for emergency care.
      </p>
    </div>
  );
}
