import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import ProfileForm from "./ProfileForm";

export default async function PatientProfilePage() {
  const session = await readPatientSession();
  if (!session) {
    redirect("/patient/login?next=/patient/profile");
  }

  const patient = await prisma.patient.findFirst({
    where: { phone: session.phone },
    include: {
      addresses: { orderBy: { savedAt: "asc" }, take: 1 },
    },
  });

  if (!patient) {
    redirect("/patient/login?next=/patient/profile");
  }

  const [firstName, ...rest] = (patient.name || "").split(" ");
  const lastName = rest.join(" ");
  const primaryAddress = patient.addresses[0];

  const versionToken = patient.profilePhotoKey ? encodeURIComponent(patient.profilePhotoKey) : null;
  const photoUrl = versionToken ? `/api/patient/profile/photo?v=${versionToken}` : null;

  const initial = {
    firstName: firstName || patient.name || "",
    lastName,
    email: patient.email || "",
    phone: patient.phone,
    address: {
      line1: primaryAddress?.line1 || "",
      line2: primaryAddress?.line2 || "",
      city: primaryAddress?.city || "",
      state: primaryAddress?.state || "",
      postalCode: primaryAddress?.postalCode || "",
    },
    photoUrl,
  };

  return (
    <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="pb-6">
          <div className="flex flex-col gap-3">
            <Link href="/patient/appointments" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to dashboard
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">Profile</p>
              <h1 className="font-serif text-3xl text-slate-900">Manage your info</h1>
              <p className="text-sm text-slate-500">Update contact details, address, and your profile picture.</p>
            </div>
          </div>

          <div className="mt-6">
            <ProfileForm initial={initial} />
          </div>
        </div>
      </div>
    </main>
  );
}
