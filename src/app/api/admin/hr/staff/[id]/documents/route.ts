import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { s3, getSignedS3Url } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET — list documents for an employee (with signed download URLs)
export async function GET(_req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: employeeId } = await params;

  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    docs.map(async (d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      downloadUrl: await getSignedS3Url(d.s3Key, 300),
    }))
  );

  return NextResponse.json(withUrls);
}

// POST — get a presigned upload URL, then record the document metadata
export async function POST(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: employeeId } = await params;
  const { documentType, name, fileType, fileSizeBytes } = await req.json();

  if (!documentType || !name || !fileType) {
    return NextResponse.json({ error: "documentType, name and fileType are required" }, { status: 400 });
  }

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) return NextResponse.json({ error: "S3 not configured" }, { status: 503 });

  const ext = fileType.split("/")[1] ?? "bin";
  const s3Key = `hr/documents/${employeeId}/${Date.now()}-${documentType.toLowerCase()}.${ext}`;

  // Generate presigned PUT URL (valid 5 minutes)
  const putCmd = new PutObjectCommand({ Bucket: bucket, Key: s3Key, ContentType: fileType });
  const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 300 });

  // Record the document metadata (the client must PUT the file to uploadUrl)
  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId,
      documentType,
      name,
      s3Key,
      fileType,
      fileSizeBytes: fileSizeBytes ?? null,
      uploadedBy: sess.userId,
    },
  });

  return NextResponse.json({ ...doc, uploadUrl, createdAt: doc.createdAt.toISOString() }, { status: 201 });
}
