import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();

  const name = (fd.get("name") as string | null)?.trim();
  const contactName = (fd.get("contactName") as string | null)?.trim();
  const email = (fd.get("email") as string | null)?.trim().toLowerCase();
  const phone = (fd.get("phone") as string | null)?.trim();
  const addressLine1 = (fd.get("addressLine1") as string | null)?.trim();
  const addressLine2 = (fd.get("addressLine2") as string | null)?.trim() || null;
  const city = (fd.get("city") as string | null)?.trim();
  const state = (fd.get("state") as string | null)?.trim();
  const pincode = (fd.get("pincode") as string | null)?.trim();
  const drugLicenseNumber = (fd.get("drugLicenseNumber") as string | null)?.trim();
  const gstNumber = (fd.get("gstNumber") as string | null)?.trim() || null;
  const serviceAreasRaw = (fd.get("serviceAreas") as string | null)?.trim();
  const notes = (fd.get("notes") as string | null)?.trim() || null;

  const redirectErr = (msg: string) => {
    const url = new URL("/admin/pharmacy-partners/onboard", req.url);
    url.searchParams.set("err", msg);
    return NextResponse.redirect(url.toString());
  };

  if (!name || !contactName || !email || !phone || !addressLine1 || !city || !state || !pincode || !drugLicenseNumber) {
    return redirectErr("Missing required fields — please fill all starred fields.");
  }

  const [dupEmail, dupLicense] = await Promise.all([
    prisma.pharmacyPartner.findUnique({ where: { email }, select: { id: true } }),
    prisma.pharmacyPartner.findFirst({ where: { drugLicenseNumber }, select: { id: true } }),
  ]);
  if (dupEmail) return redirectErr("A pharmacy partner with this email is already registered.");
  if (dupLicense) return redirectErr("A pharmacy partner with this drug license number is already registered.");

  const serviceAreas = serviceAreasRaw
    ? serviceAreasRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const partner = await prisma.pharmacyPartner.create({
    data: {
      name,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      drugLicenseNumber,
      gstNumber,
      serviceAreas,
      notes,
      isActive: true,
    },
  });

  // Auto-create portal login for the pharmacy
  const tempPassword = crypto.randomBytes(6).toString("hex"); // 12-char secure hex
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.pharmacyUser.create({
    data: { email, passwordHash, role: "PHARMACY", pharmacyPartnerId: partner.id },
  });

  // Notify pharmacy contact via WhatsApp
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
  const waMsg =
    `Hi ${contactName}! Welcome to the CalDoc Pharmacy Network.\n\n` +
    `Your pharmacy "${name}" has been onboarded and your portal is ready.\n\n` +
    `Login: ${appUrl}/pharmacy/login\n` +
    `Email: ${email}\n` +
    `Password: ${tempPassword}\n\n` +
    `Please log in and keep your credentials safe. Contact CalDoc support if you need help.`;
  sendWhatsAppText(phone, waMsg).catch((e) =>
    console.error("pharmacy onboard WA notification failed", e),
  );

  return NextResponse.redirect(
    new URL(`/admin/pharmacy-partners?created=${partner.id}`, req.url),
  );
}
