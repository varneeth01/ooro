import { NextResponse } from "next/server";
import { AdminAuthError, adminDiagnostics, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function GET() {
  try {
    const response = await proxyAdminRequest("/api/admin/displays");
    const payload = await response.json().catch(() => ({ data: [] }));
    if (!response.ok) return NextResponse.json(payload, { status: response.status });
    const displays = Array.isArray(payload.data) ? payload.data : [];
    return NextResponse.json({ data: displays.map((display: { id: string; deviceId: string; name: string; vehicleId?: string | null; createdAt: string; updatedAt: string; state: string; vehicle?: { city?: string | null } | null }) => ({
      screenId: display.id, deviceId: display.deviceId, screenName: display.name,
      screenType: "AUTO_SCREEN", city: display.vehicle?.city ?? "—", area: "—",
      vehicleId: display.vehicleId ?? undefined, createdAt: display.createdAt,
      pairedAt: display.state === "UNPAIRED" ? undefined : display.updatedAt,
      pairingStatus: display.state === "UNPAIRED" ? "UNPAIRED" : "PAIRED",
    })) });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { code: error instanceof AdminAuthError ? error.code : "ADMIN_BACKEND_UNAVAILABLE", message: "Unable to load screens" } }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const response = await proxyAdminRequest("/api/admin/displays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(await request.json()) });
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
