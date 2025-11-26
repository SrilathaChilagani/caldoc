// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";


const JWT_NAME = "prov_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedPrefixes = ["/provider"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isLogin = pathname.startsWith("/provider/login");

  if (!isProtected || isLogin) return NextResponse.next();

  const cookie = req.cookies.get(JWT_NAME)?.value;
  if (!cookie) {
    const url = new URL("/provider/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  try {
    jwt.verify(cookie, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch {
    const url = new URL("/provider/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/provider/:path*"],
};
