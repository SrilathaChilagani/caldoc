import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import ReviewDetailClient from "./ReviewDetailClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReviewDetailPage({ params }: Props) {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const { id } = await params;

  const review = await prisma.performanceReview.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, jobTitle: true, department: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true, jobTitle: true } },
    },
  });

  if (!review) notFound();

  const serialized = {
    ...review,
    submittedAt: review.submittedAt?.toISOString() ?? null,
    acknowledgedAt: review.acknowledgedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };

  return (
    <>
      <div>
        <Link href="/admin/hr/reviews" className="text-xs font-medium text-[#2f6ea5] hover:underline">← Reviews</Link>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">
          {review.employee.name} — {review.period}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Reviewed by {review.reviewer.name} · {review.employee.department.name}
        </p>
      </div>
      <ReviewDetailClient review={serialized} />
    </>
  );
}
