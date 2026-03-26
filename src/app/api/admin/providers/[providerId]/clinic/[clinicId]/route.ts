import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";

type RouteContext = { params: Promise<{ providerId: string; clinicId: string }> };

const PatchSchema = z.object({
  clinicName: z.string().min(1).max(200).optional(),
  addressLine1: z.string().min(1).max(300).optional(),
  addressLine2: z.string().max(300).nullable().optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  pincode: z.string().min(4).max(10).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/admin/providers/[providerId]/clinic/[clinicId] */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { providerId, clinicId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const clinic = await prisma.providerClinic.update({
      where: { id: clinicId, providerId },
      data: parsed.data,
    });

    return NextResponse.json({ clinic });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/** DELETE /api/admin/providers/[providerId]/clinic/[clinicId] */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { providerId, clinicId } = await ctx.params;
    await prisma.providerClinic.delete({ where: { id: clinicId, providerId } });

    // If no more active clinics, remove IN_PERSON from visitModes
    const remaining = await prisma.providerClinic.count({ where: { providerId, isActive: true } });
    if (remaining === 0) {
      const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { visitModes: true } });
      if (provider) {
        await prisma.provider.update({
          where: { id: providerId },
          data: { visitModes: provider.visitModes.filter((m) => m !== "IN_PERSON") },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
