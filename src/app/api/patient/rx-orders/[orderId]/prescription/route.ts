import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import { getSignedS3Url } from "@/lib/s3";

type RouteCtx = {
  params: Promise<{ orderId: string }>;
};

function buildPhoneCandidates(raw: string | undefined | null) {
  const trimmed = (raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  const last10 = digits.slice(-10);

  const set = new Set<string>();
  if (trimmed) set.add(trimmed);
  if (digits) set.add(digits);
  if (last10) {
    set.add(last10);
    set.add("+91" + last10);
    set.add("91" + last10);
    set.add("0" + last10);
  }

  return { last10, candidates: Array.from(set) };
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await readPatientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await ctx.params;
  const order = await prisma.rxOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      patientPhone: true,
      rxDocumentKey: true,
    },
  });
  if (!order || !order.rxDocumentKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { last10, candidates } = buildPhoneCandidates(session.phone);
  const matches =
    candidates.includes(order.patientPhone) ||
    (last10 && order.patientPhone?.includes(last10));

  if (!matches) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signedUrl = await getSignedS3Url(order.rxDocumentKey);
  return NextResponse.redirect(signedUrl, { status: 307 });
}
