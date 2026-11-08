/**
 * Convenience only: sends visitors without a session cookie straight to /login.
 * The real security check is requireUser() on every private page and action (spec §5.2).
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.cookies.has("rental_session")) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: "/dashboard/:path*" };
