import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function GET() {
  try { const response = await proxyAdminRequest("/api/admin/drivers"); return NextResponse.json(await response.json(), { status: response.status }); }
  catch (error) { const status = error instanceof AdminAuthError ? error.status : 502; return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin authorization is required" : "Admin backend is unavailable" } }, { status }); }
}
