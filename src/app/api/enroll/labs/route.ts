import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

export async function POST(req: NextRequest) {
  const data = await req.formData();

  const field = (key: string) => (data.get(key) as string | null)?.trim() ?? "";

  const labName = field("labName");
  const contactName = field("contactName");
  const email = field("email");
  const phone = field("phone");
  const addressLine1 = field("addressLine1");
  const city = field("city");
  const state = field("state");
  const pincode = field("pincode");

  // Required fields validation
  const missing = [
    !labName && "labName",
    !contactName && "contactName",
    !email && "email",
    !phone && "phone",
    !addressLine1 && "addressLine1",
    !city && "city",
    !state && "state",
    !pincode && "pincode",
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const testCategoriesRaw = field("testCategories");
  const testCategories = testCategoriesRaw
    ? testCategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const nablCertified = field("nablCertified") === "true";
  const homeCollection = field("homeCollection") === "true";

  const enrollment = await prisma.labEnrollment.create({
    data: {
      labName,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2: field("addressLine2") || null,
      city,
      state,
      pincode,
      nablCertified,
      nablCertNumber: field("nablCertNumber") || null,
      testCategories,
      homeCollection,
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
        "🔬 New lab enrollment on CalDoc",
        `Name: ${labName}`,
        `Contact: ${contactName}`,
        `City: ${city}, ${state}`,
        `📋 Review: ${base}/admin/enrollments/labs/${enrollment.id}`,
      ].join("\n");
      await sendWhatsAppText(adminPhone, msg);
      await prisma.labEnrollment.update({
        where: { id: enrollment.id },
        data: { adminNotifiedAt: new Date() },
      });
    } catch (err) {
      console.error("[enroll/labs] admin WA failed:", err);
    }
  }

  return NextResponse.json({ ok: true, id: enrollment.id });
}
