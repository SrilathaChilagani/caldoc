import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  "http://localhost:3000";

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await requireProviderSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await ctx.params;
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { phone: true, name: true } },
      provider: { select: { name: true, slug: true } },
    },
  });

  if (!appointment || appointment.providerId !== session.providerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patientPhone = appointment.patient?.phone;
  if (!patientPhone) {
    return NextResponse.json({ error: "Patient phone unavailable" }, { status: 400 });
  }

  const providerSlug = appointment.provider?.slug || appointment.providerId;
  const followupLink = providerSlug
    ? `${BASE_URL}/book/${encodeURIComponent(providerSlug)}?ref=doctor-followup`
    : `${BASE_URL}/providers`;

  const patientName = appointment.patientName || appointment.patient?.name || "there";
  const providerName = appointment.provider?.name || "your doctor";
  const message = `Hi ${patientName}, ${providerName} recommends a follow-up teleconsultation. Tap ${followupLink} to pick a slot for your next visit.`;

  try {
    await sendWhatsAppText(patientPhone, message);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unable to send follow-up";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
