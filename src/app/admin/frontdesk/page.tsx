import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import FrontDeskStaffClient from "./FrontDeskStaffClient";

export const dynamic = "force-dynamic";

export default async function FrontDeskStaffPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/frontdesk");

  const [users, clinics] = await Promise.all([
    prisma.frontDeskUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        clinics: {
          select: {
            id: true,
            providerClinic: {
              select: { id: true, clinicName: true, city: true, provider: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.providerClinic.findMany({
      where: { isActive: true },
      select: { id: true, clinicName: true, city: true, provider: { select: { name: true } } },
      orderBy: { clinicName: "asc" },
    }),
  ]);

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">Teams</p>
        <h1 className="font-serif text-3xl text-slate-900">Front desk staff</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage front desk accounts and assign them to the clinics they cover.
        </p>
      </div>
      <FrontDeskStaffClient
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          clinics: u.clinics.map((c) => ({
            assignmentId: c.id,
            clinicId: c.providerClinic.id,
            clinicName: c.providerClinic.clinicName,
            city: c.providerClinic.city,
            providerName: c.providerClinic.provider.name,
          })),
        }))}
        availableClinics={clinics.map((c) => ({
          id: c.id,
          clinicName: c.clinicName,
          city: c.city,
          providerName: c.provider.name,
        }))}
      />
    </>
  );
}
