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
    <main className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-[#eef3ff] via-white to-white py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Profile</p>
              <h1 className="text-3xl font-semibold text-slate-900">Manage your info</h1>
              <p className="text-sm text-slate-500">Update contact details, address, and your profile picture.</p>
            </div>
            <Link href="/patient/appointments" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              ← Back to portal
            </Link>
          </div>

          <div className="mt-6">
            <ProfileForm initial={initial} />
          </div>
        </div>
      </div>
    </main>
  );
}
