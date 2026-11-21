import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import OnboardEmployeeForm from "./OnboardEmployeeForm";

export const dynamic = "force-dynamic";

export default async function OnboardEmployeePage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/admin/hr/staff/new");

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, jobTitle: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">HR Portal</p>
        <h1 className="font-serif text-3xl text-slate-900">Onboard employee</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new staff member to the CalDoc team.
        </p>
      </div>
      <OnboardEmployeeForm departments={departments} managers={managers} />
    </>
  );
}
