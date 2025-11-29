import { NextRequest, NextResponse } from "next/server";
import { ADMIN_JWT_NAME, PROVIDER_JWT_NAME, resolveSessionCookieDomain } from "@/lib/auth";

function clearedRedirect(req: NextRequest) {
  const url = new URL("/provider/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });

  // Clear both canonical and any legacy cookie names
  const cookieDomain = resolveSessionCookieDomain(req.nextUrl.hostname);
  const domainOption = cookieDomain ? { domain: cookieDomain } : {};
  [PROVIDER_JWT_NAME, ADMIN_JWT_NAME].forEach((name) => {
    res.cookies.set(name, "", { path: "/", maxAge: 0, ...domainOption });
  });

  // Also clear Next.js HMR refresh cookie if it interferes (harmless otherwise)
  res.cookies.set("__next_hmr_refresher__", "", { path: "/", maxAge: 0 });

  return res;
}

export async function GET(req: NextRequest) {
  return clearedRedirect(req);
}

export async function POST(req: NextRequest) {
  return clearedRedirect(req);
}
