import { readProviderSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const sess = await readProviderSession();
  if (!sess) redirect("/provider/login?next=/provider/calendar");
  return <CalendarClient />;
}
