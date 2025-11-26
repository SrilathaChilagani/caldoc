import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import { s3 } from "@/lib/s3";

const bucket = process.env.AWS_S3_BUCKET;

export async function GET() {
  try {
    if (!bucket) {
      return NextResponse.json({ error: "S3 bucket not configured" }, { status: 500 });
    }

    const session = await readPatientSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await prisma.patient.findFirst({
      where: { phone: session.phone },
      select: { profilePhotoKey: true },
    });

    if (!patient?.profilePhotoKey) {
      return new NextResponse("", { status: 404 });
    }

    const key = patient.profilePhotoKey;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    const chunks: Uint8Array[] = [];
    if (response.Body) {
      const reader = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of reader) {
        chunks.push(chunk);
      }
    }
    const buffer = Buffer.concat(chunks);
    const contentType = response.ContentType || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("profile photo error", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
