import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";

type RouteContext = { params: Promise<{ providerId: string }> };

const ClinicSchema = z.object({
  clinicName: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(300),
  addressLine2: z.string().max(300).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(4).max(10),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

/** GET /api/admin/providers/[providerId]/clinic — list clinics for a provider */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { providerId } = await ctx.params;
    const clinics = await prisma.providerClinic.findMany({
      where: { providerId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ clinics });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/** POST /api/admin/providers/[providerId]/clinic — create a clinic */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { providerId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = ClinicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.flatten() }, { status: 400 });
    }

    // Verify provider exists
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const clinic = await prisma.providerClinic.create({
      data: { providerId, ...parsed.data },
    });

    // Ensure IN_PERSON is in provider's visitModes
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        visitModes: { push: "IN_PERSON" },
      },
    });

    return NextResponse.json({ clinic }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
