import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import NewReviewForm from "./NewReviewForm";

export const dynamic = "force-dynamic";

export default async function NewReviewPage() {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const employees = await prisma.employee.findMany({
    where: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
    select: { id: true, name: true, employeeCode: true, jobTitle: true, department: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div>
        <Link href="/admin/hr/reviews" className="text-xs font-medium text-[#2f6ea5] hover:underline">← Reviews</Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">New Performance Review</h1>
      </div>
      <NewReviewForm employees={employees} />
    </>
  );
}
