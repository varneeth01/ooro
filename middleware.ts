import { NextRequest, NextResponse } from "next/server";
import { protectedRoutePrefixes, SESSION_COOKIE, WEB_SESSION_COOKIE } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login") return NextResponse.next();
  const protectedRoute = protectedRoutePrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!protectedRoute || request.cookies.has(SESSION_COOKIE) || request.cookies.has(WEB_SESSION_COOKIE)) return NextResponse.next();
  const loginPath = pathname === "/admin" || pathname.startsWith("/admin/") ? "/admin/login" : "/login";
  const login = new URL(loginPath, request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] };
