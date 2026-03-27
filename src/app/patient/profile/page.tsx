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
    <main className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="pb-6">
          <div className="flex flex-col gap-3">
            <Link href="/patient/appointments" className="text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]">
              ← Back to dashboard
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">Profile</p>
              <h1 className="font-serif text-3xl font-semibold text-slate-900">Manage your info</h1>
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
