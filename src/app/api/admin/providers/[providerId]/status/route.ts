import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

const PayloadSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await ctx.params;
    const payload = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const provider = await prisma.provider.update({
      where: { id: providerId },
      data: { isActive: parsed.data.isActive },
      select: { id: true, isActive: true },
    });

    // Audit trail: log every admin isActive change for compliance
    prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorType: "ADMIN",
        action: parsed.data.isActive ? "PROVIDER_ACTIVATED" : "PROVIDER_DEACTIVATED",
        meta: { providerId, isActive: parsed.data.isActive },
      },
    }).catch(() => {}); // non-blocking

    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
