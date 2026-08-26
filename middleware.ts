import { NextRequest, NextResponse } from "next/server";
import { protectedRoutePrefixes, SESSION_COOKIE } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedRoute = protectedRoutePrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!protectedRoute || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url); login.searchParams.set("next", pathname); return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] };
