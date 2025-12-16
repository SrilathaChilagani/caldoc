import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LABS_JWT_NAME, resolveSessionCookieDomain } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function clearLabsCookie(req: NextRequest) {
  const jar = await cookies();
  const domain = resolveSessionCookieDomain(req.nextUrl.hostname);
  jar.set(LABS_JWT_NAME, "", {
    path: "/",
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}

export async function POST(req: NextRequest) {
  await clearLabsCookie(req);
  const next = req.nextUrl.searchParams.get("next") || "/labs/login";
  return NextResponse.redirect(new URL(next, req.nextUrl.origin), 303);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
