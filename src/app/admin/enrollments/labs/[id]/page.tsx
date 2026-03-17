import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";
import LabEnrollmentActions from "./LabEnrollmentActions";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-slate-50 py-2 text-sm last:border-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

export default async function LabEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login");

  const { id } = await params;
  const [enrollment, adminUser] = await Promise.all([
    prisma.labEnrollment.findUnique({ where: { id } }),
    prisma.adminUser.findUnique({ where: { id: sess.userId }, select: { email: true } }),
  ]);
  if (!enrollment) notFound();
  const adminEmail = adminUser?.email ?? "admin";

  const isPending = enrollment.status === "PENDING";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/enrollments/labs"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          ← Lab enrollments
        </Link>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            enrollment.status === "APPROVED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : enrollment.status === "REJECTED"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {enrollment.status}
        </span>
      </div>

      <div>
        <h1 className="font-serif text-2xl font-semibold text-slate-900">{enrollment.labName}</h1>
        <p className="text-sm text-slate-500">
          {enrollment.city}, {enrollment.state}
          {enrollment.nablCertified && (
            <span className="ml-2 rounded-full bg-[#2f6ea5]/10 px-2 py-0.5 text-xs font-semibold text-[#2f6ea5]">
              NABL Certified
            </span>
          )}
        </p>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Lab Information</h2>
        <Row label="Lab name" value={enrollment.labName} />
        <Row label="Contact name" value={enrollment.contactName} />
        <Row label="Email" value={enrollment.email} />
        <Row label="Phone" value={enrollment.phone} />
        <Row label="NABL Certified" value={enrollment.nablCertified ? "Yes" : "No"} />
        <Row label="NABL Cert Number" value={enrollment.nablCertNumber} />
        <Row label="Home collection" value={enrollment.homeCollection ? "Yes" : "No"} />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Address</h2>
        <Row label="Address line 1" value={enrollment.addressLine1} />
        <Row label="Address line 2" value={enrollment.addressLine2} />
        <Row label="City" value={enrollment.city} />
        <Row label="State" value={enrollment.state} />
        <Row label="Pincode" value={enrollment.pincode} />
      </div>

      {(enrollment.testCategories.length > 0 || enrollment.notes) && (
        <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Test Categories &amp; Notes</h2>
          {enrollment.testCategories.length > 0 && (
            <Row
              label="Test categories"
              value={
                <div className="flex flex-wrap gap-1.5">
                  {enrollment.testCategories.map((c) => (
                    <span key={c} className="rounded-full bg-[#2f6ea5]/10 px-2.5 py-0.5 text-xs font-medium text-[#2f6ea5]">
                      {c}
                    </span>
                  ))}
                </div>
              }
            />
          )}
          {enrollment.notes && <Row label="Notes" value={enrollment.notes} />}
        </div>
      )}

      {/* Review metadata */}
      {!isPending && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <span className="font-medium">Reviewed</span> by {enrollment.reviewedByEmail || "admin"} on{" "}
          {enrollment.reviewedAt?.toLocaleDateString("en-IN")}
          {enrollment.rejectionReason && (
            <div className="mt-2 text-rose-600">
              <span className="font-medium">Rejection reason:</span> {enrollment.rejectionReason}
            </div>
          )}
          {enrollment.labPartnerId && (
            <div className="mt-2">
              <span className="font-medium">Lab Partner ID:</span>{" "}
              <Link
                href="/admin/lab-partners"
                className="text-[#2f6ea5] hover:underline"
              >
                {enrollment.labPartnerId}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <LabEnrollmentActions enrollmentId={enrollment.id} adminEmail={adminEmail} />
      )}
    </div>
  );
}
