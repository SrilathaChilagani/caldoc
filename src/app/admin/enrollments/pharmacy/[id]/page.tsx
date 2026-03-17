import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";
import PharmacyEnrollmentActions from "./PharmacyEnrollmentActions";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-slate-50 py-2 text-sm last:border-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

export default async function PharmacyEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login");

  const { id } = await params;
  const [enrollment, adminUser] = await Promise.all([
    prisma.pharmacyEnrollment.findUnique({ where: { id } }),
    prisma.adminUser.findUnique({ where: { id: sess.userId }, select: { email: true } }),
  ]);
  if (!enrollment) notFound();
  const adminEmail = adminUser?.email ?? "admin";

  const isPending = enrollment.status === "PENDING";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/enrollments/pharmacy"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          ← Pharmacy enrollments
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
        <h1 className="font-serif text-2xl font-semibold text-slate-900">{enrollment.pharmacyName}</h1>
        <p className="text-sm text-slate-500">
          {enrollment.city}, {enrollment.state}
        </p>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Pharmacy Information</h2>
        <Row label="Pharmacy name" value={enrollment.pharmacyName} />
        <Row label="Contact name" value={enrollment.contactName} />
        <Row label="Email" value={enrollment.email} />
        <Row label="Phone" value={enrollment.phone} />
        <Row label="Drug License No." value={enrollment.drugLicenseNumber} />
        <Row label="GST Number" value={enrollment.gstNumber} />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Address</h2>
        <Row label="Address line 1" value={enrollment.addressLine1} />
        <Row label="Address line 2" value={enrollment.addressLine2} />
        <Row label="City" value={enrollment.city} />
        <Row label="State" value={enrollment.state} />
        <Row label="Pincode" value={enrollment.pincode} />
      </div>

      {(enrollment.serviceAreas.length > 0 || enrollment.notes) && (
        <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Service Areas &amp; Notes</h2>
          {enrollment.serviceAreas.length > 0 && (
            <Row
              label="Service areas"
              value={
                <div className="flex flex-wrap gap-1.5">
                  {enrollment.serviceAreas.map((a) => (
                    <span key={a} className="rounded-full bg-[#2f6ea5]/10 px-2.5 py-0.5 text-xs font-medium text-[#2f6ea5]">
                      {a}
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
          {enrollment.pharmacyPartnerId && (
            <div className="mt-2">
              <span className="font-medium">Pharmacy Partner ID:</span>{" "}
              <Link
                href={`/admin/pharmacy-partners`}
                className="text-[#2f6ea5] hover:underline"
              >
                {enrollment.pharmacyPartnerId}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <PharmacyEnrollmentActions enrollmentId={enrollment.id} adminEmail={adminEmail} />
      )}
    </div>
  );
}
