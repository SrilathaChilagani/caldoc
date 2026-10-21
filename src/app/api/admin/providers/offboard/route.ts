import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
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
  logAudit({ action: action === "deactivate" ? "PROVIDER_DEACTIVATED" : "PROVIDER_REACTIVATED", actorType: "ADMIN", actorId: sess.userId, meta: { providerId, action } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
