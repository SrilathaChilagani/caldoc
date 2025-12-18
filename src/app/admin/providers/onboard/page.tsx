import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export default async function AdminProviderOnboard() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/providers/onboard");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin"
          className="w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
        >
          ← Back to dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Onboard a provider</h1>
          <p className="text-sm text-slate-500">
            Capture basic credentials, upload supporting docs, and activate the doctor on CalDoc.
          </p>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
        <form method="POST" action="/api/admin/providers" encType="multipart/form-data" className="space-y-3 text-sm text-slate-600">
          <label className="block">
            <span>Name</span>
            <input name="name" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" required />
          </label>
          <label className="block">
            <span>Phone / WhatsApp</span>
            <input name="phone" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" placeholder="+91 98765 43210" required />
          </label>
          <label className="block">
            <span>Speciality</span>
            <input name="speciality" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" required />
          </label>
          <label className="block">
            <span>Languages (comma separated)</span>
            <input name="languages" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" />
          </label>
          <label className="block">
            <span>License / NPI</span>
            <input name="licenseNo" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" required />
          </label>
          <label className="block">
            <span>Registration number</span>
            <input name="registrationNumber" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" />
          </label>
          <label className="block">
            <span>Council name</span>
            <input name="councilName" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" />
          </label>
          <label className="block">
            <span>Qualification</span>
            <input name="qualification" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" />
          </label>
          <label className="block">
            <span>Slug</span>
            <input name="slug" className="mt-1 w-full rounded border border-slate-200 px-3 py-2" placeholder="dr-jones" required />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span>Portrait / profile photo</span>
              <input
                type="file"
                name="profilePhoto"
                accept="image/*"
                className="mt-1 w-full rounded border border-dashed border-slate-300 px-3 py-2 text-xs"
              />
              <p className="mt-1 text-[11px] text-slate-500">Shown on the patient-facing provider list.</p>
            </label>
            <label className="block">
              <span>License document</span>
              <input type="file" name="licenseDoc" accept="application/pdf,image/*" className="mt-1 w-full rounded border border-dashed border-slate-300 px-3 py-2 text-xs" />
            </label>
            <label className="block">
              <span>Registration certificate</span>
              <input type="file" name="registrationDoc" accept="application/pdf,image/*" className="mt-1 w-full rounded border border-dashed border-slate-300 px-3 py-2 text-xs" />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" name="is24x7" className="rounded border-slate-300" /> Available 24x7
          </label>
          <button type="submit" className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Add provider
          </button>
        </form>
      </section>
    </main>
  );
}
