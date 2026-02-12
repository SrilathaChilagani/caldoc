import { prisma } from "@/lib/db";
import RxDeliveryReviewClient from "../ui/RxDeliveryReviewClient";

export const dynamic = "force-dynamic";

export default async function RxDeliveryReviewPage() {
  const meds = await prisma.medication.findMany({
    orderBy: { name: "asc" },
    take: 400,
    select: { name: true, category: true },
  });

  const options = meds.map((med) => ({ name: med.name, category: med.category }));

  return <RxDeliveryReviewClient options={options} />;
}
