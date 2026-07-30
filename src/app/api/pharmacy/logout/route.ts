import { NextRequest, NextResponse } from "next/server";
import { PHARMACY_JWT_NAME, resolveSessionCookieDomain } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const url = new URL("/pharmacy/login?logged_out=1", request.nextUrl.origin);
  const response = NextResponse.redirect(url, 303);
  const cookieDomain = resolveSessionCookieDomain(request.nextUrl.hostname);
  const domainOption = cookieDomain ? { domain: cookieDomain } : {};
  response.cookies.set(PHARMACY_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
