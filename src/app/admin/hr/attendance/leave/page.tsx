import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import LeaveRequestsClient from "./LeaveRequestsClient";

export const dynamic = "force-dynamic";

export default async function LeaveRequestsPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login?next=/admin/hr/attendance/leave");

  const [pending, all] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { status: { not: "PENDING" } },
      include: { employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  function serialize(l: (typeof pending)[0]) {
    return {
      ...l,
      fromDate: l.fromDate.toISOString().slice(0, 10),
      toDate: l.toDate.toISOString().slice(0, 10),
      reviewedAt: l.reviewedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/hr/attendance" className="text-xs font-medium text-[#2f6ea5] hover:underline">
            ← Attendance
          </Link>
          <h1 className="mt-1 font-serif text-3xl text-slate-900">Leave requests</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {pending.length} pending approval.
          </p>
        </div>
      </div>
      <LeaveRequestsClient pending={pending.map(serialize)} history={all.map(serialize)} />
    </>
  );
}
