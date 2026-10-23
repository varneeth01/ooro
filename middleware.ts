import { verifyAdminEnvelope } from "@/lib/auth/admin-edge";
import { isAcceptedAdminRequestOrigin } from "@/lib/auth/request-origin";
import { NextRequest, NextResponse } from "next/server";
import { protectedRoutePrefixes, SESSION_COOKIE, WEB_SESSION_COOKIE } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminApi = pathname.startsWith("/api/admin/") || pathname.startsWith("/api/auth/admin/");
  if (adminApi && !["GET", "HEAD", "OPTIONS"].includes(request.method) && process.env.NODE_ENV === "production") {
    const sameOrigin = isAcceptedAdminRequestOrigin({
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      requestOrigin: request.nextUrl.origin,
    });
    if (!sameOrigin) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted" } }, { status: 403 });
  }
  if (pathname === "/admin/login" || pathname === "/admin/reset-password" || pathname === "/admin/setup-password" || pathname === "/admin/accept-invite") return NextResponse.next();
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

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)", "/api/admin/:path*", "/api/auth/admin/:path*"] };
