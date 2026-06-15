import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/sessionConstants";

/**
 * Lightweight gate: redirects users without a session cookie away from
 * protected pages. This is a UX guard only — the cookie's signature is verified
 * server-side in each page/route handler via getSessionUserId(), which is where
 * real authorization happens.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/entries", "/pin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/entries/:path*", "/pin"],
};
