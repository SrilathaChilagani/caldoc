import { requireFrontDeskSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function FrontDeskCalendarPage() {
  const sess = await requireFrontDeskSession();
  if (!sess) redirect("/frontdesk/login");

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    select: { id: true, name: true, speciality: true },
    orderBy: { name: "asc" },
  });

  return <CalendarClient initialProviders={providers.map((p, i) => ({ ...p, colorIndex: i % 8 }))} />;
}
