import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { readPatientSession, PATIENT_COOKIE, PATIENT_MAX_AGE_DAYS } from "@/lib/patientAuth.server";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { uploadToS3 } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const session = await readPatientSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await prisma.patient.findFirst({
      where: { phone: session.phone },
      select: { id: true, phone: true, name: true, profilePhotoKey: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const form = await req.formData();
    const firstName = String(form.get("firstName") || "").trim();
    const lastName = String(form.get("lastName") || "").trim();
    const email = String(form.get("email") || "").trim() || null;
    const phoneInput = String(form.get("phone") || "").trim();
    const line1 = String(form.get("line1") || "").trim();
    const line2 = String(form.get("line2") || "").trim();
    const city = String(form.get("city") || "").trim();
    const state = String(form.get("state") || "").trim();
    const postalCode = String(form.get("postalCode") || "").trim();
    const photo = form.get("photo");

    const combinedName = `${firstName} ${lastName}`.trim() || patient.name;

    let phoneToSave = patient.phone;
    if (phoneInput) {
      const meta = buildPatientPhoneMeta(phoneInput);
      if (!meta) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }
      phoneToSave = meta.canonical;
    }

    let photoKey = patient.profilePhotoKey || null;
    let photoUpdated = false;
    if (photo instanceof File && photo.size > 0) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      photoKey = `patients/${patient.id}/profile/${Date.now()}-${randomUUID()}-${photo.name}`;
      await uploadToS3({
        key: photoKey,
        contentType: photo.type || "application/octet-stream",
        body: buffer,
      });
      photoUpdated = true;
    }

    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        name: combinedName,
        email,
        phone: phoneToSave,
        profilePhotoKey: photoKey,
      },
    });

    if (line1) {
      const existingAddress = await prisma.patientAddress.findFirst({
        where: { patientId: patient.id },
        orderBy: { savedAt: "asc" },
      });

      if (existingAddress) {
        await prisma.patientAddress.update({
          where: { id: existingAddress.id },
          data: {
            contactName: combinedName,
            contactPhone: phoneToSave,
            line1,
            line2: line2 || null,
            city,
            state,
            postalCode,
          },
        });
      } else {
        await prisma.patientAddress.create({
          data: {
            patientId: patient.id,
            contactName: combinedName,
            contactPhone: phoneToSave,
            line1,
            line2: line2 || null,
            city,
            state,
            postalCode,
          },
        });
      }
    }

    if (phoneInput) {
      const jar = await cookies();
      jar.set(PATIENT_COOKIE, phoneToSave, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: PATIENT_MAX_AGE_DAYS * 24 * 60 * 60,
        path: "/",
      });
    }

    return NextResponse.json({ ok: true, photoUpdated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("profile update error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
