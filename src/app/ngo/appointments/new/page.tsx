import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";
import NgoBulkBooking from "./NgoBulkBooking";

export const dynamic = "force-dynamic";

export default async function NgoBulkBookingPage() {
  const session = await requireNgoSession();
  if (!session) {
    redirect(`/ngo/login?next=${encodeURIComponent("/ngo/appointments/new")}`);
  }

  const specialtiesData = await prisma.provider.findMany({
    where: { isActive: true },
    distinct: ["speciality"],
    select: { speciality: true },
    orderBy: { speciality: "asc" },
  });
  const specialties = specialtiesData
    .map((row) => row.speciality)
    .filter((name): name is string => Boolean(name));

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">NGO portal</p>
            <h1 className="text-2xl font-semibold text-slate-900">Bulk booking</h1>
            <p className="text-sm text-slate-600">
              Pick specialties, doctors, and reserve multiple slots in one pass. You can add patient details later from
              your reservations list.
            </p>
          </div>
          <Link
            href="/ngo/appointments"
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span aria-hidden="true">←</span> Back to dashboard
          </Link>
        </div>
        <NgoBulkBooking specialties={specialties} />
      </div>
    </main>
  );
}
