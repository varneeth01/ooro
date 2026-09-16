import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function GET() {
  try { const response = await proxyAdminRequest("/api/admin/displays/live-map"); const payload = await response.json().catch(() => ({ data: [] })); return NextResponse.json(payload, { status: response.status }); }
  catch (error) { const status = error instanceof AdminAuthError ? error.status : 502; return NextResponse.json({ error: { code: error instanceof AdminAuthError ? error.code : "ADMIN_BACKEND_UNAVAILABLE", message: "Unable to load live map" } }, { status }); }
}
