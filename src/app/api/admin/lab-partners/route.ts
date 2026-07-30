import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
  const nablCertifiedRaw = fd.get("nablCertified");
  const nablCertified = nablCertifiedRaw === "on" || nablCertifiedRaw === "true";
  const nablCertNumber = (fd.get("nablCertNumber") as string | null)?.trim() || null;
  const testCategoriesRaw = (fd.get("testCategories") as string | null)?.trim();
  const homeCollectionRaw = fd.get("homeCollection");
  const homeCollection = homeCollectionRaw === "on" || homeCollectionRaw === "true";
  const notes = (fd.get("notes") as string | null)?.trim() || null;

  const redirectErr = (msg: string) =>
    NextResponse.redirect(
      new URL(`/admin/lab-partners/onboard?err=${encodeURIComponent(msg)}`, req.url),
      303,
    );

  if (!name || !contactName || !email || !phone || !addressLine1 || !city || !state || !pincode) {
    return redirectErr("Please fill in all required fields.");
  }

  const testCategories = testCategoriesRaw
    ? testCategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const dupEmail = await prisma.labPartner.findUnique({ where: { email }, select: { id: true } });
  if (dupEmail) return redirectErr("A lab partner with this email is already registered.");

  const partner = await prisma.labPartner.create({
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
      nablCertified,
      nablCertNumber,
      testCategories,
      homeCollection,
      notes,
      isActive: true,
    },
  });

  const tempPassword = crypto.randomBytes(6).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.labUser.create({
    data: {
      email,
      passwordHash,
      role: "LAB_ADMIN",
      labPartnerId: partner.id,
    },
  });

  const portalOrigin = new URL(req.url).origin;
  const waMsg =
    `Welcome to CalDoc!\nYour lab partner portal account is ready.\n\nLab: ${name}\nEmail: ${email}\nPassword: ${tempPassword}\nPortal: ${portalOrigin}/labs/login\n\nPlease log in and change your password after first sign-in.`;
  sendWhatsAppText(phone, waMsg).catch((e) => console.error("lab onboard WA", e));

  return NextResponse.redirect(
    new URL(`/admin/lab-partners?created=${partner.id}`, req.url),
  );
}
