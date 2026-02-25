import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";
import { getSignedS3Url } from "@/lib/s3";
import EnrollmentActions from "./EnrollmentActions";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-2 border-b border-slate-50 last:border-0 text-sm">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login");

  const { id } = await params;
  const [enrollment, adminUser] = await Promise.all([
    prisma.providerEnrollment.findUnique({ where: { id } }),
    prisma.adminUser.findUnique({ where: { id: sess.userId }, select: { email: true } }),
  ]);
  if (!enrollment) notFound();
  const adminEmail = adminUser?.email ?? "admin";

  // Generate signed S3 URLs for documents (60 min expiry)
  const [profileUrl, qualificationUrl, registrationUrl] = await Promise.all([
    enrollment.profilePhotoKey ? getSignedS3Url(enrollment.profilePhotoKey, 3600) : null,
    enrollment.qualificationDocKey ? getSignedS3Url(enrollment.qualificationDocKey, 3600) : null,
    enrollment.registrationDocKey ? getSignedS3Url(enrollment.registrationDocKey, 3600) : null,
  ]);

  const isPending = enrollment.status === "PENDING";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/enrollments"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
        >
          ← All enrollments
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
        <h1 className="font-serif text-2xl font-semibold text-slate-900">{enrollment.fullName}</h1>
        <p className="text-sm text-slate-500">
          {enrollment.qualification} · {enrollment.speciality} · {enrollment.city}, {enrollment.state}
        </p>
      </div>

      {/* Profile photo */}
      {profileUrl && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profileUrl}
            alt={enrollment.fullName}
            className="h-20 w-20 rounded-2xl object-cover border border-slate-100"
          />
        </div>
      )}

      {/* Details */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Personal Information</h2>
        <Row label="Full name" value={enrollment.fullName} />
        <Row label="Email" value={enrollment.email} />
        <Row label="Phone" value={enrollment.phone} />
        <Row label="Date of birth" value={enrollment.dob ? enrollment.dob.toLocaleDateString("en-IN") : null} />
        <Row label="Gender" value={enrollment.gender} />
        <Row label="City / State" value={`${enrollment.city}, ${enrollment.state}`} />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Medical Qualification</h2>
        <Row label="Qualification" value={enrollment.qualification} />
        <Row label="University" value={enrollment.university} />
        <Row label="Year of passing" value={enrollment.qualificationYear} />
        <Row label="Registration no." value={enrollment.registrationNumber} />
        <Row label="Council" value={enrollment.registrationCouncil} />
        <Row label="Reg. year" value={enrollment.registrationYear} />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Practice Details</h2>
        <Row label="Speciality" value={enrollment.speciality} />
        <Row label="Sub-speciality" value={enrollment.subSpeciality} />
        <Row label="Experience" value={enrollment.experienceYears ? `${enrollment.experienceYears} years` : null} />
        <Row label="Hospital / Clinic" value={enrollment.currentHospital} />
        <Row label="Languages" value={enrollment.languages.join(", ")} />
        <Row label="Consultation modes" value={enrollment.visitModes.join(", ")} />
        <Row label="Consultation fee" value={enrollment.feePaise ? `₹${enrollment.feePaise / 100}` : null} />
      </div>

      {enrollment.bio && (
        <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Professional Bio</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{enrollment.bio}</p>
        </div>
      )}

      {/* Documents */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Submitted Documents</h2>
        <div className="flex flex-wrap gap-3">
          {qualificationUrl ? (
            <a
              href={qualificationUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[#2f6ea5]/30 bg-[#2f6ea5]/5 px-4 py-2.5 text-sm font-medium text-[#2f6ea5] hover:bg-[#2f6ea5]/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Degree Certificate
            </a>
          ) : (
            <span className="text-sm text-slate-400">No degree certificate uploaded</span>
          )}
          {registrationUrl && (
            <a
              href={registrationUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[#2f6ea5]/30 bg-[#2f6ea5]/5 px-4 py-2.5 text-sm font-medium text-[#2f6ea5] hover:bg-[#2f6ea5]/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Registration Certificate
            </a>
          )}
        </div>
      </div>

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
          {enrollment.providerId && (
            <div className="mt-2">
              <span className="font-medium">Provider ID:</span>{" "}
              <Link
                href={`/admin/providers/${enrollment.providerId}`}
                className="text-[#2f6ea5] hover:underline"
              >
                {enrollment.providerId}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <EnrollmentActions
          enrollmentId={enrollment.id}
          adminEmail={adminEmail}
        />
      )}
    </div>
  );
}
