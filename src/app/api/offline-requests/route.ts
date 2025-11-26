import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

const RequestSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  speciality: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await prisma.offlineRequest.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        speciality: parsed.data.speciality,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
