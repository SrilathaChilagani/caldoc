import { NextRequest, NextResponse } from "next/server";
import { FRONTDESK_JWT_NAME, resolveSessionCookieDomain } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/frontdesk/login?logged_out=1", req.nextUrl.origin), 303);
  const domain = resolveSessionCookieDomain(req.nextUrl.hostname);
  res.cookies.set(FRONTDESK_JWT_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
  return res;
}
