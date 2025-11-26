// src/app/provider/login/page.tsx
import { redirect } from "next/navigation";
import { readProviderSession } from "@/lib/auth.server";
import LoginForm from "./ui/LoginForm";

export default async function ProviderLoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; logged_out?: string; err?: string; uid?: string }> }) {
  const sess = await readProviderSession();
  const sp = await searchParams;
  const next = sp?.next || "/provider/appointments";
  const loggedOut = !!sp?.logged_out;
  const errorCode = sp?.err;
  const lastEmail = sp?.uid;
  const errorMessage =
    errorCode === "creds"
      ? "Invalid email or password."
      : errorCode === "server"
      ? "Unable to sign in right now. Please try again."
      : undefined;

  if (sess) redirect(next);

  const portalTarget = next.includes("/admin")
    ? "admin"
    : next.includes("/pharmacy")
    ? "pharmacy"
    : "provider";

  const portalCopy = {
    provider: {
      badge: "Provider portal",
      headline: "Secure access for Telemed doctors",
      body:
        "View pending visits, review patient uploads, confirm or reschedule appointments, and update your availability — all in one streamlined dashboard.",
      accent: "from-[#eef3ff] via-white to-white",
    },
    admin: {
      badge: "Admin dashboard",
      headline: "Operations login for Telemed admins",
      body:
        "Manage providers, generate slots, review captured payments, and reconcile appointments securely.",
      accent: "from-[#fff7ed] via-white to-white",
    },
    pharmacy: {
      badge: "Pharmacy queue",
      headline: "Log in to fulfill prescriptions",
      body:
        "Review delivery addresses, download prescriptions, and keep patients updated on dispatches.",
      accent: "from-[#f0f7ff] via-white to-white",
    },
  } as const;

  const copy = portalCopy[portalTarget];

  return (
    <main className={`bg-gradient-to-b ${copy.accent} py-14`}>
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 text-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.badge}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{copy.headline}</h1>
          <p className="text-base text-slate-600">{copy.body}</p>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-800">You can:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {portalTarget === "admin" ? (
                <>
                  <li>Generate appointment slots and onboard providers</li>
                  <li>Monitor captured payments and receipts</li>
                  <li>Review appointments by status in real time</li>
                </>
              ) : portalTarget === "pharmacy" ? (
                <>
                  <li>See every prescription with delivery details</li>
                  <li>Download PDF scripts and patient uploads</li>
                  <li>Keep operations synced for dispatch</li>
                </>
              ) : (
                <>
                  <li>Confirm or cancel remote visits in two clicks</li>
                  <li>Check prescription requests & upload notes</li>
                  <li>Generate future slots or adjust your schedule</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Sign in to continue</h2>
            <p className="text-sm text-slate-500">
              {portalTarget === "admin"
                ? "Use your Telemed admin credentials."
                : portalTarget === "pharmacy"
                ? "Access for licensed pharmacy partners."
                : "Use your provider credentials."}
            </p>
          </div>
          <div className="mt-6 space-y-4">
            <LoginForm nextUrl={next} loggedOut={loggedOut} errorMessage={errorMessage} defaultEmail={lastEmail} />
            <p className="text-xs text-slate-500 text-center">
              You&apos;ll be redirected to <span className="font-medium">{next}</span> after login.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
