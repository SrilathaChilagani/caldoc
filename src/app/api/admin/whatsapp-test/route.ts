import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { prisma } from "@/lib/db";

function masked(val: string | undefined): string {
  if (!val) return "❌ NOT SET";
  if (val.length <= 8) return "✅ " + "*".repeat(val.length);
  return "✅ " + val.slice(0, 4) + "*".repeat(val.length - 8) + val.slice(-4);
}

/** GET — return env var status + recent outbound message log */
export async function GET() {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = {
    WABA_ID: masked(process.env.WABA_ID),
    WHATSAPP_TOKEN: masked(process.env.WHATSAPP_TOKEN),
    WHATSAPP_LANG: process.env.WHATSAPP_LANG || "(default: en_US)",
    SKIP_PATIENT_OTP: process.env.SKIP_PATIENT_OTP || "(not set → OTP enabled)",
    WHATSAPP_TEMPLATE_PATIENT_LOGIN: process.env.WHATSAPP_TEMPLATE_PATIENT_LOGIN || "(default: patient_login_otp)",
    WHATSAPP_PROVIDER_TEMPLATE: process.env.WHATSAPP_PROVIDER_TEMPLATE || "(default: provider_booking_alert)",
    WHATSAPP_TMPL_CHECKIN: process.env.WHATSAPP_TMPL_CHECKIN || "(default: appointment_checkin)",
    WHATSAPP_TMPL_APPT_REMINDER_24H: process.env.WHATSAPP_TMPL_APPT_REMINDER_24H || "(default: appointment_reminder_24hr)",
  };

  const recentMessages = await prisma.outboundMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      createdAt: true,
      channel: true,
      kind: true,
      toPhone: true,
      template: true,
      status: true,
      error: true,
      messageId: true,
    },
  });

  const summary = {
    total: await prisma.outboundMessage.count(),
    sent: await prisma.outboundMessage.count({ where: { status: "SENT" } }),
    failed: await prisma.outboundMessage.count({ where: { status: "FAILED" } }),
  };

  return NextResponse.json({ vars, summary, recentMessages });
}

/** POST — send a test WhatsApp text message to a given phone number */
export async function POST(req: NextRequest) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, message } = await req.json().catch(() => ({}));
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const text = message || "🩺 CalDoc WhatsApp test message. If you received this, WhatsApp is working correctly!";

  try {
    const result = await sendWhatsAppText(phone, text);
    return NextResponse.json({ ok: true, messageId: result?.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
