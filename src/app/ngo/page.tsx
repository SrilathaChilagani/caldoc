import { redirect } from "next/navigation";
import { readNgoSession } from "@/lib/auth.server";

export default async function NgoHomePage() {
  const session = await readNgoSession();
  if (!session) {
    redirect("/ngo/login");
  }
  redirect("/ngo/appointments");
}
