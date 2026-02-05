import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!region || !bucket) {
  console.warn("[s3] Missing AWS_REGION or AWS_S3_BUCKET env; uploads will fail");
}

export const s3 = new S3Client({
  region,
});

export async function uploadToS3(opts: {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}) {
  if (!bucket) throw new Error("Missing AWS_S3_BUCKET");
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
  });
  await s3.send(command);
  return { bucket, key: opts.key };
}

export async function downloadFromS3(key: string) {
  if (!bucket) throw new Error("Missing AWS_S3_BUCKET");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await s3.send(command);
  const chunks: Uint8Array[] = [];
  const body = response.Body;
  if (!body) return Buffer.alloc(0);
  const reader = body as AsyncIterable<Uint8Array>;
  for await (const chunk of reader) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function s3ObjectExists(key: string) {
  if (!bucket) return false;
  try {
    const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
    await s3.send(command);
    return true;
  } catch {
    return false;
  }
}

export async function getSignedS3Url(key: string, expiresInSeconds = 60) {
  if (!bucket || !region) throw new Error("Missing AWS config for signed URLs");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
