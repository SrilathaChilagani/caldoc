// src/app/provider/login/page.tsx
import { redirect } from "next/navigation";
import { readProviderSession, readAdminSession } from "@/lib/auth.server";
import LoginForm from "./ui/LoginForm";

type LoginSearch = {
  next?: string;
  logged_out?: string;
  err?: string;
  uid?: string;
  portal?: string;
};

export default async function ProviderLoginPage({
  searchParams,
}: { searchParams: Promise<LoginSearch> }) {
  const providerSess = await readProviderSession();
  const adminSess = await readAdminSession();
  const sp = await searchParams;
  const next = sp?.next || "/provider/appointments";
  const portalHint = (sp?.portal || "").toLowerCase();
  const loggedOut = !!sp?.logged_out;
  const errorCode = sp?.err;
  const lastEmail = sp?.uid;
  const errorMessage =
    errorCode === "creds"
      ? "Invalid email or password."
      : errorCode === "server"
      ? "Unable to sign in right now. Please try again."
      : undefined;

  const isLabsPortal = portalHint === "labs" || next.includes("/labs");
  const portalTarget = isLabsPortal
    ? "labs"
    : next.includes("/admin")
    ? "admin"
    : next.includes("/pharmacy")
    ? "pharmacy"
    : "provider";

  const requiresAdmin = portalTarget === "admin" || portalTarget === "labs";

  if (requiresAdmin && adminSess) {
    redirect(next);
  }
  if (!requiresAdmin && providerSess) {
    redirect(next);
  }

  const portalCopy = {
    provider: {
      badge: "Provider portal",
      headline: "Sign in to manage appointments",
      body: "Use your provider credentials to continue.",
    },
    admin: {
      badge: "Admin portal",
      headline: "Sign in to CalDoc admin",
      body: "Operations staff only.",
    },
    pharmacy: {
      badge: "Pharmacy portal",
      headline: "Sign in to manage prescriptions",
      body: "Use the whitelisted pharmacy account.",
    },
    labs: {
      badge: "Labs portal",
      headline: "Sign in to manage lab orders",
      body: "Labs team members only.",
    },
  } as const;

  const copy = portalCopy[portalTarget];

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7f2ea] px-4 py-16">
      <div className="w-full max-w-md space-y-6 rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{copy.badge}</p>
          <h1 className="font-serif text-2xl font-semibold text-slate-900">{copy.headline}</h1>
          <p className="text-sm text-slate-500">{copy.body}</p>
        </div>
        <LoginForm nextUrl={next} loggedOut={loggedOut} errorMessage={errorMessage} defaultEmail={lastEmail} />
        <p className="text-center text-xs text-slate-500">
          You&apos;ll be redirected to <span className="font-medium">{next}</span> after login.
        </p>
      </div>
    </main>
  );
}
