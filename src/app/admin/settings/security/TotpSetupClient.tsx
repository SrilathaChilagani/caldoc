"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Step = "idle" | "qr" | "verify" | "done";

export default function TotpSetupClient({ totpEnabled }: { totpEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function call(action: string, extra?: Record<string, unknown>) {
    const res = await fetch("/api/admin/auth/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function handleSetup() {
    setLoading(true); setError("");
    try {
      const data = await call("SETUP");
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("qr");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    setLoading(true); setError("");
    try {
      await call("VERIFY", { code });
      setStep("done");
      router.refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function handleDisable() {
    setLoading(true); setError("");
    try {
      await call("DISABLE", { password, code: disableCode });
      router.refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  const fieldClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30";

  if (step === "done") {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-800">Two-factor authentication is now active.</p>
        <p className="text-xs text-emerald-600 mt-0.5">You will need your authenticator app on every future login.</p>
      </div>
    );
  }

  if (!totpEnabled) {
    return (
      <div className="space-y-4">
        {step === "idle" && (
          <button onClick={handleSetup} disabled={loading}
            className="rounded-xl bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50">
            {loading ? "Generating…" : "Set up 2FA"}
          </button>
        )}

        {step === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>, then enter the 6-digit code below.
            </p>
            {qrCode && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="TOTP QR code" width={200} height={200} className="rounded-xl border border-slate-200 p-2" />
              </div>
            )}
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">Can&apos;t scan? Enter secret manually</summary>
              <code className="mt-1 block font-mono text-xs break-all">{secret}</code>
            </details>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">6-digit verification code</label>
              <input type="text" inputMode="numeric" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)}
                className={fieldClass + " text-center tracking-widest font-mono text-lg"} placeholder="000 000" autoFocus />
            </div>
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            <button onClick={handleVerify} disabled={loading || code.replace(/\s/g, "").length < 6}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Verifying…" : "Activate 2FA"}
            </button>
          </div>
        )}

        {error && step === "idle" && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  }

  // TOTP is enabled — show disable form
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">2FA is protecting your account. To disable it, confirm your password and current authenticator code.</p>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} placeholder="Current password" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Authenticator code</label>
          <input type="text" inputMode="numeric" maxLength={7} value={disableCode} onChange={(e) => setDisableCode(e.target.value)}
            className={fieldClass + " font-mono tracking-widest"} placeholder="000 000" />
        </div>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <button onClick={handleDisable} disabled={loading || !password}
        className="rounded-xl border border-rose-200 px-5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
        {loading ? "Disabling…" : "Disable 2FA"}
      </button>
    </div>
  );
}
