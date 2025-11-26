import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export async function POST(req: NextRequest) {
  const sess = await requireAdminSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const providerId = String(form.get("providerId") || "");
  const action = String(form.get("action") || "deactivate");

  if (!providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }

  await prisma.provider.update({
    where: { id: providerId },
    data: { isActive: action !== "deactivate" },
  });

  return NextResponse.json({ ok: true });
}
