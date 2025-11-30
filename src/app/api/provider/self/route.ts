import { NextResponse } from "next/server";
import { requireProviderSession } from "@/lib/auth.server";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await requireProviderSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const provider = await prisma.provider.findUnique({
    where: { id: session.providerId },
    select: { id: true, name: true, slug: true },
  });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json({ id: provider.id, name: provider.name, slug: provider.slug });
}
