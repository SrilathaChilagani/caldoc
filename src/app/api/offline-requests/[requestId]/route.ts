import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";

const UpdateSchema = z.object({ status: z.string().min(3).max(40) });

type RouteCtx = { params: Promise<{ requestId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const admin = await requireAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId } = await ctx.params;
    const payload = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.offlineRequest.update({
      where: { id: requestId },
      data: {
        status: parsed.data.status,
        resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
