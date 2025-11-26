import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

const NoteSchema = z.object({
  text: z.string().trim().min(1, "Note cannot be empty"),
});

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireProviderSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId } = await ctx.params;
    const json = await req.json().catch(() => null);
    const parsed = NoteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid note" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { providerId: true },
    });

    if (!appointment || appointment.providerId !== session.providerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.visitNote.upsert({
      where: { appointmentId },
      update: { text: parsed.data.text },
      create: { appointmentId, text: parsed.data.text },
    });

    await logAudit({
      action: "notes.save",
      actorType: "PROVIDER",
      actorId: session.userId,
      meta: { appointmentId, length: parsed.data.text.length },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
