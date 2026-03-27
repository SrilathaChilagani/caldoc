import { redirect } from "next/navigation";
import { readPharmacySession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type SearchParams = { next?: string; err?: string; uid?: string };

export default async function PharmacyLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { next = "/pharmacy", err, uid } = (await searchParams) || {};
  const sess = await readPharmacySession();
  if (sess) {
    redirect(next);
  }

  const message =
    err === "creds"
      ? "Invalid email or password."
      : err === "server"
      ? "Unable to sign in."
      : undefined;

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7f2ea] px-4 py-16">
      <div className="w-full max-w-md space-y-6 rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Pharmacy portal</p>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to manage prescriptions</h1>
          <p className="text-sm text-slate-500">Use the whitelisted pharmacy account to continue.</p>
        </div>
        <form method="POST" action="/api/pharmacy/login" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          {message && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{message}</div>}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              name="email"
              defaultValue={uid}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Sign in
          </button>
        </form>
        <p className="text-center text-xs text-slate-500">Need access? Contact CalDoc support to add your pharmacy account.</p>
      </div>
    </main>
  );
}
