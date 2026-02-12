import { NextRequest, NextResponse } from "next/server";
import { LAB_TEST_OPTIONS } from "@/lib/labTests";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const matches = LAB_TEST_OPTIONS.filter((test) => test.toLowerCase().includes(q)).slice(0, 8);
  return NextResponse.json({
    suggestions: matches.map((label) => ({ label })),
  });
}
