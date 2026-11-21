import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import TotpSetupClient from "./TotpSetupClient";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const user = await prisma.adminUser.findUnique({
    where: { id: sess.userId },
    select: { email: true, totpEnabled: true },
  });
  if (!user) redirect("/admin/login");

  return (
    <>
      <div>
        <Link href="/admin" className="text-xs font-medium text-[#2f6ea5] hover:underline">← Dashboard</Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">Security settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Two-factor authentication (TOTP)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Use Google Authenticator, Authy, or any TOTP app.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.totpEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {user.totpEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <TotpSetupClient totpEnabled={user.totpEnabled} />
        </div>
      </div>
    </>
  );
}
