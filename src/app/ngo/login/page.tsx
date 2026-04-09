import { redirect } from "next/navigation";
import { readNgoSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type SearchParams = { next?: string; err?: string; logged_out?: string; uid?: string };

export default async function NgoLoginPage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const session = await readNgoSession();
  const { next = "/ngo/appointments", err, uid } = (await searchParams) || {};

  if (session) redirect(next);

  const message =
    err === "creds"
      ? "Invalid email or password."
      : err === "server"
      ? "Unable to sign in right now. Please try again."
      : undefined;

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7f2ea] px-4 py-16">
      <div className="w-full max-w-md space-y-6 rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">NGO portal</p>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to your NGO account</h1>
          <p className="text-sm text-slate-500">Use the credentials shared with your CalDoc partner manager.</p>
        </div>
        <form method="POST" action="/api/ngo/login" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          {message && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{message}</div>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              name="email"
              defaultValue={uid}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:ring-2 focus:ring-[#2f6ea5]/20"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#255b8b]"
          >
            Sign in
          </button>
        </form>
        <p className="text-center text-xs text-slate-500">
          Need help? Email{" "}
          <a href="mailto:support@caldoc.in" className="font-medium text-slate-700">
            support@caldoc.in
          </a>
          .
        </p>
      </div>
    </main>
  );
}
