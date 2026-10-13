import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Cookie names must stay in sync with src/lib/auth.ts
const COOKIE_ADMIN     = "admin_sess";
const COOKIE_PROVIDER  = "prov_session";
const COOKIE_NGO       = "ngo_sess";
const COOKIE_LABS      = "labs_sess";
const COOKIE_PHARMACY  = "pharmacy_sess";
const COOKIE_FRONTDESK = "fd_sess";
const COOKIE_PATIENT   = "patient_phone";

type PortalConfig = {
  prefix: string;
  loginPath: string;
  /** Cookie names accepted as valid auth for this portal (first match wins). */
  cookies: string[];
  /** Path prefixes that are public within this portal (no auth required). */
  publicSubPaths?: string[];
};

// Labs, pharmacy, and frontdesk accept admin_sess as fallback — matching
// the route-handler-level requireLabsSession / requirePharmacySession /
// requireFrontDeskSession fallback in src/lib/auth.server.ts.
const PORTALS: PortalConfig[] = [
  { prefix: "/admin",     loginPath: "/admin/login",     cookies: [COOKIE_ADMIN] },
  { prefix: "/provider",  loginPath: "/provider/login",  cookies: [COOKIE_PROVIDER] },
  { prefix: "/ngo",       loginPath: "/ngo/login",       cookies: [COOKIE_NGO] },
  { prefix: "/labs",      loginPath: "/labs/login",      cookies: [COOKIE_LABS, COOKIE_ADMIN] },
  { prefix: "/pharmacy",  loginPath: "/pharmacy/login",  cookies: [COOKIE_PHARMACY, COOKIE_ADMIN] },
  { prefix: "/frontdesk", loginPath: "/frontdesk/login", cookies: [COOKIE_FRONTDESK, COOKIE_ADMIN] },
  {
    prefix: "/patient",
    loginPath: "/patient/login",
    cookies: [COOKIE_PATIENT],
    publicSubPaths: ["/patient/signup"],
  },
];

async function hasValidSession(
  req: NextRequest,
  cookieNames: string[],
  secret: Uint8Array,
): Promise<boolean> {
  for (const name of cookieNames) {
    const token = req.cookies.get(name)?.value;
    if (!token) continue;
    try {
      await jwtVerify(token, secret);
      return true;
    } catch {
      // Expired or tampered — try next cookie in list
    }
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    // Misconfigured environment — pass through rather than breaking every page,
    // but log so it's visible in Vercel function logs.
    console.error("[middleware] JWT_SECRET not set — portal auth guards are disabled");
    return NextResponse.next();
  }

  const secret = new TextEncoder().encode(jwtSecret);

  for (const portal of PORTALS) {
    if (pathname !== portal.prefix && !pathname.startsWith(portal.prefix + "/")) {
      continue;
    }

    // The login page (and any sub-paths of it) are always public.
    if (pathname === portal.loginPath || pathname.startsWith(portal.loginPath + "/")) {
      return NextResponse.next();
    }

    // Additional explicitly public sub-paths within the portal.
    if (
      portal.publicSubPaths?.some(
        (p) => pathname === p || pathname.startsWith(p + "/"),
      )
    ) {
      return NextResponse.next();
    }

    // Verify JWT signature + expiry for any accepted cookie.
    if (await hasValidSession(req, portal.cookies, secret)) {
      return NextResponse.next();
    }

    // No valid session — redirect to login preserving the intended destination.
    const loginUrl = new URL(portal.loginPath, req.url);
    const dest = pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("next", dest);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Only run on portal page routes — API routes (/api/*) handle their own auth
// inside each route handler and are intentionally excluded here.
export const config = {
  matcher: [
    "/admin/:path*",
    "/provider/:path*",
    "/ngo/:path*",
    "/labs/:path*",
    "/pharmacy/:path*",
    "/frontdesk/:path*",
    "/patient/:path*",
  ],
};
