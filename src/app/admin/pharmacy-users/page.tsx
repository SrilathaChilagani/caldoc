import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import PharmacyTeamClient from "./PharmacyTeamClient";

export const dynamic = "force-dynamic";

export default async function AdminPharmacyUsersPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/pharmacy-users");

  const users = await prisma.pharmacyUser.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Pharmacy team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Onboard and off-board pharmacy team members who fulfil prescription orders.
        </p>
      </div>
      <PharmacyTeamClient initialUsers={serialized} />
    </>
  );
}
