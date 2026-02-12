import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

const MAX_BYTES = Number(process.env.RX_DELIVERY_UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File cannot be empty" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `rx-orders/prescriptions/${randomUUID()}-${file.name}`;

    await uploadToS3({
      key,
      contentType: file.type || "application/octet-stream",
      body: buffer,
    });

    return NextResponse.json({
      key,
      fileName: file.name || "prescription",
      contentType: file.type || "application/octet-stream",
      size: file.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload error";
    console.error("[rx-delivery/upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
