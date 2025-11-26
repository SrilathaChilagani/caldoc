import { NextRequest, NextResponse } from "next/server";
import { clearPatientCookie } from "@/lib/patientAuth.server";

export async function GET(req: NextRequest) {
  await clearPatientCookie();
  const url = new URL("/patient/login", req.url);
  return NextResponse.redirect(url);
}
