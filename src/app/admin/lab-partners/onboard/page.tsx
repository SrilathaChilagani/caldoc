import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export default async function OnboardLabPartner() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/lab-partners/onboard");

  const inputCls = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-1 focus:ring-[#2f6ea5]/30";
  const labelCls = "block text-xs font-medium text-slate-600";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/lab-partners"
          className="w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          ← Back to lab partners
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
          <h1 className="text-2xl font-semibold text-slate-900">Onboard a lab partner</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register a certified diagnostic laboratory to fulfil at-home sample collection orders on CalDoc.
          </p>
        </div>
      </div>

      <form
        method="POST"
        action="/api/admin/lab-partners"
        className="space-y-5 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]"
      >
        {/* Basic info */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Lab details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Lab name *
              <input name="name" className={inputCls} required placeholder="Thyrocare Technologies" />
            </label>
            <label className={labelCls}>
              Contact person name *
              <input name="contactName" className={inputCls} required placeholder="Dr. Anita Rao" />
            </label>
            <label className={labelCls}>
              Email *
              <input name="email" type="email" className={inputCls} required placeholder="partner@thyrocare.com" />
            </label>
            <label className={labelCls}>
              Phone / WhatsApp *
              <input name="phone" className={inputCls} required placeholder="+91 98765 43210" />
            </label>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${labelCls} sm:col-span-2`}>
              Address line 1 *
              <input name="addressLine1" className={inputCls} required placeholder="Plot 12, MIDC Industrial Area" />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Address line 2
              <input name="addressLine2" className={inputCls} placeholder="Building B, 2nd Floor" />
            </label>
            <label className={labelCls}>
              City *
              <input name="city" className={inputCls} required placeholder="Mumbai" />
            </label>
            <label className={labelCls}>
              State *
              <input name="state" className={inputCls} required placeholder="Maharashtra" />
            </label>
            <label className={labelCls}>
              PIN code *
              <input name="pincode" className={inputCls} required placeholder="400093" maxLength={6} />
            </label>
          </div>
        </div>

        {/* Accreditation */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2f6ea5]">Accreditation & capabilities</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              NABL certificate number
              <input name="nablCertNumber" className={inputCls} placeholder="MC-3829" />
              <p className="mt-1 text-[11px] text-slate-400">Leave blank if not NABL accredited.</p>
            </label>
            <label className={labelCls}>
              Test categories offered (comma-separated)
              <input name="testCategories" className={inputCls} placeholder="Blood Tests, Hormonal, Pathology, Imaging" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" name="nablCertified" className="rounded accent-[#2f6ea5]" />
              NABL certified
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" name="homeCollection" defaultChecked className="rounded accent-[#2f6ea5]" />
              Home sample collection available
            </label>
          </div>
        </div>

        {/* Notes */}
        <label className={labelCls}>
          Notes / remarks
          <textarea name="notes" rows={3} className={`${inputCls} resize-none`} placeholder="Operational hours, turnaround time, special test capabilities, etc." />
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-[#2f6ea5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
        >
          Onboard lab partner
        </button>
      </form>
    </main>
  );
}
