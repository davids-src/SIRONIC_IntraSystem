import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PORTAL_COOKIE_NAME } from "@erp/portal-auth/constants";
import { verifyPortalSession } from "@erp/portal-auth/session";

/** Reachable without a portal session. `/igazolas/<token>` is the public magic-link sign-off. */
const PUBLIC_PREFIXES = [
  "/login",
  "/meghivo",
  "/elfelejtett-jelszo",
  "/jelszo-visszaallitas",
  "/igazolas/",
  "/portal/igazolas/",
];

function redirectTo(request: NextRequest, pathname: string) {
  const base = process.env.PORTAL_URL || request.nextUrl.origin;
  return NextResponse.redirect(new URL(pathname, base));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const claims = await verifyPortalSession(
    request.cookies.get(PORTAL_COOKIE_NAME)?.value,
    process.env.PORTAL_AUTH_SECRET,
  );
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p),
  );

  if (isPublic) {
    // A signed-in user has no business on the login page; the token pages stay reachable.
    if (claims && pathname === "/login") return redirectTo(request, "/");
    return NextResponse.next();
  }
  if (!claims) {
    const response = redirectTo(request, "/login");
    response.cookies.delete(PORTAL_COOKIE_NAME);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
