import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/_next", "/api/webhooks", "/locked", "/favicon", "/manifest"];

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  if (PUBLIC_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = cookies.get("APP_LOCK")?.value;
  if (token && token === process.env.APP_SECRET) {
    return NextResponse.next();
  }

  const redirectURL = nextUrl.clone();
  redirectURL.pathname = "/locked";
  redirectURL.searchParams.set("next", nextUrl.pathname + nextUrl.search);
  return NextResponse.redirect(redirectURL);
}

export const config = {
  matcher: "/:path*",
};
