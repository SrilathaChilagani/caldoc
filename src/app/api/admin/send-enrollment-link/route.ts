import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const BASE = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";

const LINKS: Record<string, string> = {
  doctor: `${BASE}/enroll`,
  pharmacy: `${BASE}/enroll/pharmacy`,
  lab: `${BASE}/enroll/labs`,
};

const MESSAGES: Record<string, string> = {
  doctor: `Hello! CalDoc invites you to join as a Doctor. Please complete your enrollment here:\n${BASE}/enroll`,
  pharmacy: `Hello! CalDoc invites you to join as a Pharmacy Partner. Please complete your enrollment here:\n${BASE}/enroll/pharmacy`,
  lab: `Hello! CalDoc invites you to join as a Diagnostic Lab Partner. Please complete your enrollment here:\n${BASE}/enroll/labs`,
};

export async function POST(req: NextRequest) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, type } = await req.json();
  if (!type || !LINKS[type]) return NextResponse.json({ error: "Invalid enrollment type" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

  try {
    await sendWhatsAppText(phone, MESSAGES[type]);
    return NextResponse.json({ ok: true, link: LINKS[type] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
