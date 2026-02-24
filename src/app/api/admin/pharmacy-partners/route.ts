import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

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

  if (!name || !contactName || !email || !phone || !addressLine1 || !city || !state || !pincode || !drugLicenseNumber) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

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

  return NextResponse.redirect(
    new URL(`/admin/pharmacy-partners?created=${partner.id}`, req.url)
  );
}
