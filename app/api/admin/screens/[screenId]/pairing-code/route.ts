import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function POST(_request: Request, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const { screenId } = await params;
    const response = await proxyAdminRequest("/api/displays/pairing-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayId: screenId }) });
    const payload = await response.json().catch(() => ({ error: { message: "Backend returned invalid JSON" } }));
    if (!response.ok) return NextResponse.json(payload, { status: response.status });
    const data = payload.data ?? payload;
    return NextResponse.json({ data: { screenId: data.displayId, code: data.pairingCode, status: "ACTIVE", createdAt: new Date().toISOString(), expiresAt: data.expiresAt } }, { status: response.status });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin authorization is required" : "Admin backend is unavailable" } }, { status });
  }
}
