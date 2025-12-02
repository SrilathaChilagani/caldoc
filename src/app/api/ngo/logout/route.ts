import { NextRequest, NextResponse } from "next/server";
import { NGO_JWT_NAME, resolveSessionCookieDomain } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const url = new URL(request.nextUrl.searchParams.get("next") || "/ngo/login?logged_out=1", request.nextUrl.origin);
  const response = NextResponse.redirect(url, 303);
  const cookieDomain = resolveSessionCookieDomain(request.nextUrl.hostname);
  const domainOption = cookieDomain ? { domain: cookieDomain } : {};
  response.cookies.set(NGO_JWT_NAME, "", { path: "/", maxAge: 0, ...domainOption });
  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
