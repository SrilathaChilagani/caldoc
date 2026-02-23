import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { s3 } from "@/lib/s3";

const bucket = process.env.AWS_S3_BUCKET;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    if (!bucket) {
      return NextResponse.json({ error: "S3 bucket not configured" }, { status: 500 });
    }
    const { slug } = await ctx.params;
    if (!slug) {
      return new NextResponse("Missing slug", { status: 400 });
    }

    const provider = await prisma.provider.findUnique({
      where: { slug },
      select: { profilePhotoKey: true },
    });

    if (!provider?.profilePhotoKey) {
      return new NextResponse("", { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: provider.profilePhotoKey,
    });
    const response = await s3.send(command);
    const contentType = response.ContentType || "application/octet-stream";

    return new NextResponse(response.Body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // URL includes ?v=<photoKey>, so this can be safely cached aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[providers/photo] error", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
