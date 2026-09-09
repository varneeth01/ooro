import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  try { const { orderNumber } = await params; const response = await proxyAdminRequest(`/api/admin/orders/${encodeURIComponent(orderNumber)}`); const payload = await response.json().catch(() => ({ error: { message: "Backend returned invalid JSON" } })); return NextResponse.json(payload, { status: response.status }); }
  catch (error) { const status = error instanceof AdminAuthError ? error.status : 502; return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin authorization is required" : "Admin backend is unavailable" } }, { status }); }
}
