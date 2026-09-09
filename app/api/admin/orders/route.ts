import { NextResponse } from "next/server";
import { AdminAuthError, adminDiagnostics, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const response = await proxyAdminRequest(`/api/admin/orders${url.search}`);
    const payload = await response.json().catch(() => ({ error: { code: "BACKEND_INVALID_RESPONSE", message: "Backend returned invalid JSON" } }));
    adminDiagnostics({ adminApiConfigured: true, tokenPresent: true, tokenHeaderPresent: true, backendReached: true, authResult: response.status === 401 || response.status === 403 ? "denied" : "allowed" });
    if (response.status === 401) return NextResponse.json({ error: { code: "SESSION_EXPIRED", message: "Your admin session has expired" } }, { status: 401 });
    if (response.status === 403) return NextResponse.json({ error: { code: "ADMIN_ACCESS_DENIED", message: "Admin access denied" } }, { status: 403 });
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: { code: error.code, message: error.code === "ADMIN_AUTH_REQUIRED" ? "Admin authentication is required" : error.code === "ADMIN_ACCESS_DENIED" ? "Admin access denied" : "Your admin session has expired" } }, { status: error.status });
    return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend is unavailable" } }, { status: 502 });
  }
}
