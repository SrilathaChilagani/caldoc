import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import StaffDirectoryClient from "./StaffDirectoryClient";

export const dynamic = "force-dynamic";

export default async function StaffDirectoryPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/admin/hr/staff");

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        employeeType: true,
        status: true,
        workLocation: true,
        joiningDate: true,
        systemRole: true,
        department: { select: { id: true, name: true } },
        reportingManager: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = employees.map((e) => ({
    ...e,
    joiningDate: e.joiningDate.toISOString(),
  }));

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">HR Portal</p>
          <h1 className="font-serif text-3xl text-slate-900">Staff directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {employees.length} total employees across all departments.
          </p>
        </div>
        <Link
          href="/admin/hr/staff/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
        >
          + Onboard employee
        </Link>
      </div>
      <StaffDirectoryClient employees={serialized} departments={departments} />
    </>
  );
}
