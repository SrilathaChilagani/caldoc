import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { uploadToS3 } from "@/lib/s3";
import { buildPatientPhoneMeta } from "@/lib/phone";

export const dynamic = "force-dynamic";

const providerSchema = z.object({
  name: z.string().min(3).max(120),
  phone: z.string().min(8).max(20),
  speciality: z.string().min(2).max(120),
  languages: z.string().optional(),
  licenseNo: z.string().min(1).max(120),
  registrationNumber: z.string().optional(),
  councilName: z.string().optional(),
  qualification: z.string().optional(),
  slug: z.string().min(2).max(120),
});

function parseBody(body: Record<string, unknown>) {
  return providerSchema.parse({
    name: body.name,
    phone: body.phone,
    speciality: body.speciality,
    languages: body.languages,
    licenseNo: body.licenseNo,
    registrationNumber: body.registrationNumber,
    councilName: body.councilName,
    qualification: body.qualification,
    slug: body.slug,
  });
}

export async function POST(req: NextRequest) {
  const sess = await requireAdminSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctype = req.headers.get("content-type") || "";
  let parsed: z.infer<typeof providerSchema>;
  let formData: FormData | null = null;

  try {
    if (ctype.includes("multipart/form-data")) {
      formData = await req.formData();
      const textFields: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (typeof value === "string") {
          textFields[key] = value;
        }
      });
      parsed = parseBody(textFields);
    } else {
      const json = await req.json().catch(() => ({}));
      parsed = parseBody(json);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const phoneMeta = buildPatientPhoneMeta(parsed.phone);
  if (!phoneMeta) {
    return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
  }

  const languages = (parsed.languages || "")
    .split(",")
    .map((lang) => lang.trim())
    .filter(Boolean);

  try {
    const provider = await prisma.provider.create({
      data: {
        name: parsed.name,
        phone: phoneMeta.canonical,
        speciality: parsed.speciality,
        languages,
        licenseNo: parsed.licenseNo,
        registrationNumber: parsed.registrationNumber || null,
        councilName: parsed.councilName || null,
        qualification: parsed.qualification || null,
        slug: parsed.slug,
        isActive: true,
      },
    });

    if (formData) {
      const uploads: Record<string, string | undefined> = {};

      const processUpload = async (field: string, folder: string, aliases: string[] = []) => {
        let file = formData!.get(field);
        if (!(file instanceof File) || file.size === 0) {
          for (const alias of aliases) {
            const maybe = formData!.get(alias);
            if (maybe instanceof File && maybe.size > 0) {
              file = maybe;
              break;
            }
          }
        }
        if (file instanceof File && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const filename = file.name || `${field}.pdf`;
          const key = `providers/${provider.id}/${folder}/${filename}`;
          await uploadToS3({
            key,
            body: buffer,
            contentType: file.type || "application/octet-stream",
          });
          uploads[field] = key;
        }
      };

      await processUpload("profilePhoto", "profile");
      await processUpload("licenseDocument", "documents", ["licenseDoc"]);
      await processUpload("registrationDocument", "documents", ["registrationDoc"]);

      if (Object.keys(uploads).length) {
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            profilePhotoKey: uploads.profilePhoto,
            licenseDocKey: uploads.licenseDocument,
            registrationDocKey: uploads.registrationDocument,
          },
        });
      }
    }
  } catch (err) {
    console.error("[admin/providers] create error", err);
    return NextResponse.json({ error: "Failed to create provider" }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
