import { NextRequest, NextResponse } from "next/server";
import { requireProviderSession } from "@/lib/auth.server";
import { uploadToS3 } from "@/lib/s3";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function fileExtension(filename: string) {
  const parts = filename.split(".");
  if (parts.length <= 1) return "";
  return parts.pop() || "";
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireProviderSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Upload a valid photo" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name?.trim() || "profile-photo";
    const ext = fileExtension(safeName) || "jpg";
    const key = `providers/${session.providerId}/profile/${Date.now()}.${ext}`;

    await uploadToS3({
      key,
      contentType: file.type || "application/octet-stream",
      body: buffer,
    });

    await prisma.provider.update({
      where: { id: session.providerId },
      data: { profilePhotoKey: key },
    });

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("[provider/photo] upload error", err);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
