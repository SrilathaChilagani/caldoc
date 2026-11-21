import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOperationsSession } from "@/lib/auth.server";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  return (
    <>
      <div>
        <Link href="/admin" className="text-xs font-medium text-[#2f6ea5] hover:underline">← Dashboard</Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">Analytics</h1>
        <p className="mt-0.5 text-sm text-slate-500">Platform metrics and performance trends</p>
      </div>
      <AnalyticsDashboardClient />
    </>
  );
}
