import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { sameOriginRedirect } from "@/lib/auth/same-origin-redirect";

// Only allow same-origin relative post-auth destinations.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/admin";
  return value.startsWith("/admin") && !value.startsWith("/admin/login") ? value : "/admin";
}
export async function GET(request: NextRequest) {
  const target = safeNext(request.nextUrl.searchParams.get("next"));
  try {
    // Route handlers can set the refreshed, sealed HttpOnly cookie.
    await getAuthenticatedAdmin();
    return sameOriginRedirect(target);
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 502) {
      return new NextResponse("Authentication service is unavailable. Your session was not removed; please retry.", { status: 503, headers: { "cache-control": "no-store" } });
    }
    const response = sameOriginRedirect(`/admin/login?${new URLSearchParams({ next: target })}`);
    response.cookies.set("ooro_session", "", { httpOnly: true, path: "/", expires: new Date(0) });
    response.headers.set("cache-control", "no-store");
    return response;
  }
}
