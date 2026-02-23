import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import LabTeamClient from "./LabTeamClient";

export const dynamic = "force-dynamic";

export default async function AdminLabUsersPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/lab-users");

  const users = await prisma.labUser.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Admin portal</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Lab team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Onboard and off-board lab team members who process and report test orders.
        </p>
      </div>
      <LabTeamClient initialUsers={serialized} />
    </>
  );
}
