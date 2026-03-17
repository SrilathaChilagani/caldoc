import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const adminEmail = (body?.adminEmail as string) || "admin";

  const enrollment = await prisma.pharmacyEnrollment.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  if (enrollment.status !== "PENDING") {
    return NextResponse.json({ error: "Enrollment is not in PENDING status" }, { status: 409 });
  }

  // Create PharmacyPartner and update enrollment in a transaction
  const { partner } = await prisma.$transaction(async (tx) => {
    const partner = await tx.pharmacyPartner.create({
      data: {
        name: enrollment.pharmacyName,
        contactName: enrollment.contactName,
        email: enrollment.email,
        phone: enrollment.phone,
        addressLine1: enrollment.addressLine1,
        addressLine2: enrollment.addressLine2 ?? undefined,
        city: enrollment.city,
        state: enrollment.state,
        pincode: enrollment.pincode,
        drugLicenseNumber: enrollment.drugLicenseNumber,
        gstNumber: enrollment.gstNumber ?? undefined,
        serviceAreas: enrollment.serviceAreas,
        notes: enrollment.notes ?? undefined,
        isActive: true,
      },
    });

    await tx.pharmacyEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByEmail: adminEmail,
        pharmacyPartnerId: partner.id,
      },
    });

    return { partner };
  });

  // Notify pharmacy via WhatsApp
  if (enrollment.phone) {
    try {
      const base = appBaseUrl();
      const msg = [
        `Congratulations ${enrollment.contactName}!`,
        `Your CalDoc pharmacy partner application for ${enrollment.pharmacyName} has been approved.`,
        ``,
        `You can now receive prescription orders through CalDoc.`,
        `Our team will be in touch with onboarding details.`,
        ``,
        `For support: ${base}`,
      ].join("\n");
      await sendWhatsAppText(enrollment.phone, msg);
    } catch (err) {
      console.error("[pharmacy/approve] WA failed:", err);
    }
  }

  return NextResponse.json({ ok: true, pharmacyPartnerId: partner.id });
}
