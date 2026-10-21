import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ENROLL_IP_LIMIT    = { maxRequests: 3, windowMs: 60 * 60_000 };      // 3/hr per IP
const ENROLL_EMAIL_LIMIT = { maxRequests: 2, windowMs: 24 * 60 * 60_000 }; // 2/day per email

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

export async function POST(req: NextRequest) {
  const ipRl = checkRateLimit(getClientIp(req.headers), ENROLL_IP_LIMIT);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfterSec) } },
    );
  }

  const data = await req.formData();

  const field = (key: string) => (data.get(key) as string | null)?.trim() ?? "";

  const pharmacyName = field("pharmacyName");
  const contactName = field("contactName");
  const email = field("email").toLowerCase();
  const phone = field("phone");
  const addressLine1 = field("addressLine1");
  const city = field("city");
  const state = field("state");
  const pincode = field("pincode");
  const drugLicenseNumber = field("drugLicenseNumber");

  // Required fields validation
  const missing = [
    !pharmacyName && "pharmacyName",
    !contactName && "contactName",
    !email && "email",
    !phone && "phone",
    !addressLine1 && "addressLine1",
    !city && "city",
    !state && "state",
    !pincode && "pincode",
    !drugLicenseNumber && "drugLicenseNumber",
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const emailRl = checkRateLimit(`enroll-pharm:${email}`, ENROLL_EMAIL_LIMIT);
  if (!emailRl.allowed) {
    return NextResponse.json(
      { error: "An enrollment for this email was already submitted. Please wait 24 hours before resubmitting." },
      { status: 429, headers: { "Retry-After": String(emailRl.retryAfterSec) } },
    );
  }

  const serviceAreasRaw = field("serviceAreas");
  const serviceAreas = serviceAreasRaw
    ? serviceAreasRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const enrollment = await prisma.pharmacyEnrollment.create({
    data: {
      pharmacyName,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2: field("addressLine2") || null,
      city,
      state,
      pincode,
      drugLicenseNumber,
      gstNumber: field("gstNumber") || null,
      serviceAreas,
      notes: field("notes") || null,
      status: "PENDING",
    },
  });

  // Notify admin via WhatsApp
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      const base = appBaseUrl();
      const msg = [
        "💊 New pharmacy enrollment on CalDoc",
        `Name: ${pharmacyName}`,
        `Contact: ${contactName}`,
        `City: ${city}, ${state}`,
        `Drug Licence: ${drugLicenseNumber}`,
        `📋 Review: ${base}/admin/enrollments/pharmacy/${enrollment.id}`,
      ].join("\n");
      await sendWhatsAppText(adminPhone, msg);
      await prisma.pharmacyEnrollment.update({
        where: { id: enrollment.id },
        data: { adminNotifiedAt: new Date() },
      });
    } catch (err) {
      console.error("[enroll/pharmacy] admin WA failed:", err);
    }
  }

  return NextResponse.json({ ok: true, id: enrollment.id });
}
