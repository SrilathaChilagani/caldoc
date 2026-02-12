import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const meds = await prisma.medication.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { generic: { contains: q, mode: "insensitive" } },
        { form: { contains: q, mode: "insensitive" } },
        { strength: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { name: true, generic: true, form: true, strength: true },
  });

  const compositions = Array.from(
    new Set(meds.map((med) => med.generic?.trim()).filter(Boolean) as string[]),
  ).slice(0, 4);

  const suggestions = [
    ...meds.map((med) => ({
      label: med.name,
      type: "medicine" as const,
      subtitle: [med.form, med.strength, med.generic].filter(Boolean).join(" • "),
    })),
    ...compositions.map((comp) => ({
      label: comp,
      type: "composition" as const,
      subtitle: "Composition",
    })),
  ];

  return NextResponse.json({ suggestions });
}
