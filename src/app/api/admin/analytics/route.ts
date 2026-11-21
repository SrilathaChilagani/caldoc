import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

function getISTDateRange(daysBack: number) {
  const now = new Date();
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET);
  istNow.setUTCHours(0, 0, 0, 0);
  const from = new Date(istNow.getTime() - daysBack * 24 * 60 * 60 * 1000 - IST_OFFSET);
  const to = new Date(now.getTime());
  return { from, to };
}

export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);
  const { from, to } = getISTDateRange(days);

  const [
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    totalRevenuePaise,
    activePatients,
    newPatients,
    labOrders,
    rxOrders,
    avgRating,
    ratingCount,
    appointmentsByDay,
    revenueByDay,
    appointmentsBySpeciality,
    appointmentsByVisitMode,
    topProviders,
  ] = await Promise.all([
    // Total appointments in range
    prisma.appointment.count({ where: { createdAt: { gte: from, lte: to } } }),
    // Completed
    prisma.appointment.count({ where: { status: "COMPLETED", createdAt: { gte: from, lte: to } } }),
    // Cancelled
    prisma.appointment.count({ where: { status: { in: ["CANCELLED", "CANCELED"] }, createdAt: { gte: from, lte: to } } }),
    // Revenue (captured payments for appointments in range)
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "CAPTURED", appointment: { createdAt: { gte: from, lte: to } } },
    }),
    // Patients who had appointments in range
    prisma.appointment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { patientId: true },
      distinct: ["patientId"],
    }),
    // New patient registrations
    prisma.patient.count({ where: { createdAt: { gte: from, lte: to } } }),
    // Lab orders
    prisma.labOrder.count({ where: { createdAt: { gte: from, lte: to } } }),
    // Rx orders
    prisma.rxOrder.count({ where: { createdAt: { gte: from, lte: to } } }),
    // Average rating
    prisma.appointmentRating.aggregate({ _avg: { rating: true }, where: { createdAt: { gte: from, lte: to } } }),
    // Rating count
    prisma.appointmentRating.count({ where: { createdAt: { gte: from, lte: to } } }),
    // Appointments by day (raw SQL for performance)
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') as day,
             COUNT(*) as count
      FROM "Appointment"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY day ORDER BY day ASC
    `,
    // Revenue by day
    prisma.$queryRaw<{ day: string; total: bigint }[]>`
      SELECT DATE((p."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') as day,
             SUM(p.amount) as total
      FROM "Payment" p
      JOIN "Appointment" a ON a.id = p."appointmentId"
      WHERE p.status = 'CAPTURED' AND a."createdAt" >= ${from} AND a."createdAt" <= ${to}
      GROUP BY day ORDER BY day ASC
    `,
    // By speciality
    prisma.appointment.groupBy({
      by: ["providerId"],
      _count: { id: true },
      where: { createdAt: { gte: from, lte: to } },
    }),
    // By visit mode
    prisma.appointment.groupBy({
      by: ["visitMode"],
      _count: { id: true },
      where: { createdAt: { gte: from, lte: to } },
    }),
    // Top providers by completed consultations
    prisma.appointment.groupBy({
      by: ["providerId"],
      _count: { id: true },
      where: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  // Enrich top providers with names
  const providerIds = topProviders.map((p) => p.providerId);
  const providerNames = await prisma.provider.findMany({
    where: { id: { in: providerIds } },
    select: { id: true, name: true, speciality: true },
  });
  const providerMap = Object.fromEntries(providerNames.map((p) => [p.id, p]));

  return NextResponse.json({
    period: { days, from: from.toISOString(), to: to.toISOString() },
    overview: {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
      totalRevenuePaise: totalRevenuePaise._sum.amount ?? 0,
      activePatients: activePatients.length,
      newPatients,
      labOrders,
      rxOrders,
      avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : null,
      ratingCount,
    },
    charts: {
      appointmentsByDay: appointmentsByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
      revenueByDay: revenueByDay.map((r) => ({ day: r.day, totalPaise: Number(r.total) })),
      visitModes: appointmentsByVisitMode.map((r) => ({ mode: r.visitMode ?? "UNKNOWN", count: r._count.id })),
    },
    topProviders: topProviders.map((p) => ({
      providerId: p.providerId,
      name: providerMap[p.providerId]?.name ?? "Unknown",
      speciality: providerMap[p.providerId]?.speciality ?? "",
      completedConsults: p._count.id,
    })),
  });
}
