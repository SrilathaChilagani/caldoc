import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/labCatalog";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const results = searchCatalog(q, 8);
  return NextResponse.json({
    suggestions: results.map((e) => ({
      label: e.name,
      code: e.code,
      fasting: e.fasting,
      fastingHours: e.fastingHours,
      sampleType: e.sampleType,
      turnaroundDays: e.turnaroundDays,
      pricePaise: e.pricePaise,
      homeCollectionOk: e.homeCollectionOk,
      prepInstructions: e.prepInstructions,
    })),
  });
}
