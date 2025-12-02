import { redirect } from "next/navigation";
import LoginForm from "@/app/provider/login/ui/LoginForm";
import { readNgoSession } from "@/lib/auth.server";

export default async function NgoLoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; err?: string; logged_out?: string; uid?: string }> }) {
  const session = await readNgoSession();
  const sp = await searchParams;
  const next = sp?.next || "/ngo/appointments";
  const errorCode = sp?.err;
  const loggedOut = !!sp?.logged_out;
  const defaultEmail = sp?.uid;
  const errorMessage =
    errorCode === "creds"
      ? "Invalid email or password."
      : errorCode === "server"
      ? "Unable to sign in right now. Please try again."
      : undefined;

  if (session) {
    redirect(next);
  }

  return (
    <main className="bg-gradient-to-b from-[#f0f7ff] via-white to-white py-14">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 text-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">NGO portal</p>
          <h1 className="text-3xl font-semibold text-slate-900">Book and manage NGO appointments</h1>
          <p className="text-base text-slate-600">
            Hold slots in bulk, monitor confirmations, and download receipts or prescriptions for every beneficiary from a
            single dashboard.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-800">What you can do</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Book blocks of appointments by specialty or provider</li>
              <li>Track confirmations, reschedules, and pending slots</li>
              <li>Download receipts and prescriptions for reporting</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Sign in to your NGO account</h2>
            <p className="text-sm text-slate-500">Use the credentials shared with your CalDoc partner manager.</p>
          </div>
          <div className="mt-6 space-y-4">
            <LoginForm
              nextUrl={next}
              loggedOut={loggedOut}
              errorMessage={errorMessage}
              defaultEmail={defaultEmail}
              action="/api/ngo/login"
            />
            <p className="text-xs text-center text-slate-500">
              Need help? Email <a href="mailto:support@caldoc.in" className="font-medium text-slate-700">support@caldoc.in</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
