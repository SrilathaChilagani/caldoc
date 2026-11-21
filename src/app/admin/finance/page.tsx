import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOperationsSession } from "@/lib/auth.server";
import FinanceDashboardClient from "./FinanceDashboardClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  return (
    <>
      <div>
        <Link href="/admin" className="text-xs font-medium text-[#2f6ea5] hover:underline">← Dashboard</Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">Finance</h1>
        <p className="mt-0.5 text-sm text-slate-500">Provider payouts, TDS/Section 194J, and refunds</p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <strong>Setup required:</strong> Add <code className="font-mono">GST_NUMBER</code>, <code className="font-mono">COMPANY_PAN</code>,
        and <code className="font-mono">COMPANY_NAME</code> to Vercel environment variables to enable GST invoices.
        Enable Razorpay Route in your dashboard to automate provider payouts.
      </div>

      <FinanceDashboardClient />
    </>
  );
}
