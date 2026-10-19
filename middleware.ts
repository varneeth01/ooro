import { verifyAdminEnvelope } from "@/lib/auth/admin-edge";
import { NextRequest, NextResponse } from "next/server";
import { protectedRoutePrefixes, SESSION_COOKIE, WEB_SESSION_COOKIE } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const access = await verifyAdminEnvelope(request.cookies.get(SESSION_COOKIE)?.value);
    if (access === "allowed") return NextResponse.next();
    if (access === "unavailable") return new NextResponse("Admin authentication service unavailable. Please retry.", { status:503, headers:{"cache-control":"no-store"} });
    const destination = new URL(access === "forbidden" ? "/unauthorized" : "/admin/login",request.url);
    if(access === "anonymous") destination.searchParams.set("next",pathname);
    return NextResponse.redirect(destination);
  }
  const protectedRoute = protectedRoutePrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!protectedRoute || request.cookies.has(SESSION_COOKIE) || request.cookies.has(WEB_SESSION_COOKIE)) return NextResponse.next();
  const loginPath = pathname === "/admin" || pathname.startsWith("/admin/") ? "/admin/login" : "/login";
  const login = new URL(loginPath, request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] };
