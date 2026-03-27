"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const OTP_COOLDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_PATIENT_OTP_COOLDOWN ?? "60");

type Tab = "otp" | "email";
type EmailMode = "signin" | "signup";

type Props = {
  next: string;
  initialPhone?: string;
};

export default function LoginClient({ next, initialPhone }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // OTP state
  const [tab, setTab] = useState<Tab>("otp");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(initialPhone || "");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [prefillRequested, setPrefillRequested] = useState(false);

  // Email state
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [name, setName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Shared state
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function resetError() { setError(null); setStatus(null); }

  // ── OTP flow ──────────────────────────────────────────────

  function resetToPhone() {
    setStep("phone"); setOtp(""); resetError();
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || cooldown > 0) return;
    setLoading(true); resetError();
    try {
      const res = await fetch("/api/patient/login/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to send OTP");
      if (data.skip && data.redirect) {
        router.push(data.redirect); startTransition(() => router.refresh()); return;
      }
      setStep("otp");
      setStatus(data.masked
        ? `OTP sent via WhatsApp to ${data.masked} (${data.ttlMinutes || 5} min validity)`
        : "We sent a 6-digit code to your WhatsApp.");
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
    setLoading(true); resetError();
    try {
      const res = await fetch("/api/patient/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invalid code");
      router.push(data.redirect || next); startTransition(() => router.refresh());
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
    requestOtp().catch(() => setPrefillRequested(false));
  }, [initialPhone, phone, prefillRequested, step]);

  // ── Email flow ────────────────────────────────────────────

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); resetError();
    try {
      const res = await fetch("/api/patient/login/email-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login failed");
      router.push(data.redirect || next); startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); resetError();
    try {
      const res = await fetch("/api/patient/register-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: emailPhone, email, password, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Registration failed");
      router.push(data.redirect || next); startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t); resetError();
    setStep("phone"); setOtp("");
  }

  function switchEmailMode(m: EmailMode) {
    setEmailMode(m); resetError();
  }

  return (
    <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
      <div className="space-y-1 text-center mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Patient portal</p>
        <h2 className="text-2xl font-semibold text-slate-900">Sign in to view your visits</h2>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button
          onClick={() => switchTab("otp")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            tab === "otp" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          WhatsApp OTP
        </button>
        <button
          onClick={() => switchTab("email")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            tab === "email" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Email
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

      {/* ── WhatsApp OTP tab ── */}
      {tab === "otp" && (
        <>
          <p className="text-sm text-slate-500 text-center mb-4">
            {step === "phone" ? "Enter your number with country code to get a WhatsApp OTP." : "Enter the code we sent on WhatsApp."}
          </p>
          {step === "otp" && (
            <div className="text-center mb-2">
              <button onClick={resetToPhone} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                Change number
              </button>
            </div>
          )}
          {step === "phone" ? (
            <form className="space-y-4" onSubmit={requestOtp}>
              <label className="block text-sm font-medium text-slate-700">
                Mobile number
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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
                {loading ? "Verifying…" : "Verify & continue"}
              </button>
            </form>
          )}
        </>
      )}

      {/* ── Email tab ── */}
      {tab === "email" && (
        <>
          {/* Sign in / Sign up toggle */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 mb-5">
            <button
              onClick={() => switchEmailMode("signin")}
              className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-all ${
                emailMode === "signin" ? "bg-white shadow text-slate-900" : "text-slate-500"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchEmailMode("signup")}
              className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-all ${
                emailMode === "signup" ? "bg-white shadow text-slate-900" : "text-slate-500"
              }`}
            >
              Sign up
            </button>
          </div>

          {emailMode === "signin" ? (
            <form className="space-y-4" onSubmit={handleEmailSignIn}>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <div className="relative mt-1">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <div className="text-right">
                <a href="/patient/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                  Forgot password?
                </a>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleEmailSignUp}>
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Priya Sharma"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Mobile number
                <input
                  value={emailPhone}
                  onChange={(e) => setEmailPhone(e.target.value)}
                  type="tel"
                  autoComplete="tel"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="+91 98765 43210"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <div className="relative mt-1">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </>
      )}

      <p className="mt-5 text-center text-xs text-slate-500">
        By continuing you agree to our privacy policy and terms. TELEMEDICINE services are not for emergency care.
      </p>
    </div>
  );
}
