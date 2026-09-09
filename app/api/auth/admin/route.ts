import { NextResponse } from "next/server";
import { AdminAuthError, getAuthenticatedAdmin, clearBackendSession } from "@/lib/auth/backend-session";

export async function DELETE() { await clearBackendSession(); return NextResponse.json({ ok: true }); }

export async function GET() {
  try { const admin = await getAuthenticatedAdmin(); return NextResponse.json({ ok: true, role: admin.role }); }
  catch (error) { if (error instanceof AdminAuthError) return NextResponse.json({ error: { code: error.code, message: error.code === "ADMIN_ACCESS_DENIED" ? "Admin access denied" : "Admin authentication is required" } }, { status: error.status }); return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend is unavailable" } }, { status: 502 }); }
}
