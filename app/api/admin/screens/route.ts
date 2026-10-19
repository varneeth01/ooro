import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AdminAuthError, adminDiagnostics, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function GET() {
  const requestId = randomUUID();
  try {
    const response = await proxyAdminRequest("/api/admin/displays");
    const payload = await response.json();
    if (!response.ok) return NextResponse.json({ ...payload, requestId: payload.requestId ?? requestId }, { status: response.status });
    if (!Array.isArray(payload.data)) throw new Error("Invalid backend fleet contract");
    const displays = payload.data;
    return NextResponse.json({ data: displays.map((display: { id: string; deviceId: string; name: string; ownershipType?: string; inventoryConfig?: {city?: string}; vehicleId?: string | null; createdAt: string; updatedAt: string; state: string; connectivity?: string; appVersion?: string | null; manifestVersion?: number | null; lastLatitude?: number | null; lastLongitude?: number | null; lastLocationAt?: string | null; lastHeartbeatAt?: string | null; currentCampaignId?: string | null; currentCreativeId?: string | null; currentPlaybackState?: string | null; vehicle?: { area?: string | null; city?: string | null; registrationNumber?: string | null } | null; heartbeats?: Array<{ occurredAt?: string; receivedAt?: string; networkType?: string | null }> }) => ({
      screenId: display.id, deviceId: display.deviceId, screenName: display.name,
      screenType: display.ownershipType ?? "AUTO_SCREEN", city: display.vehicle?.city ?? display.inventoryConfig?.city ?? "—", area: display.vehicle?.area ?? "—", vehicleIdentifier: display.vehicle?.registrationNumber ?? null,
      vehicleId: display.vehicleId ?? undefined, createdAt: display.createdAt,
      pairedAt: display.state === "UNPAIRED" ? undefined : display.updatedAt,
      pairingStatus: display.state === "UNPAIRED" ? "UNPAIRED" : "PAIRED", connectivity: display.connectivity === "DEGRADED" ? "STALE" : display.connectivity ?? "NEVER_CONNECTED", latitude: display.lastLatitude ?? null, longitude: display.lastLongitude ?? null, lastLocationAt: display.lastLocationAt ?? null, lastHeartbeatAt: display.lastHeartbeatAt ?? display.heartbeats?.[0]?.receivedAt ?? display.heartbeats?.[0]?.occurredAt ?? null, currentCampaignId: display.currentCampaignId ?? null, currentCreativeId: display.currentCreativeId ?? null, playbackState: display.currentPlaybackState ?? null, manifestVersion: display.manifestVersion ?? null, networkType: display.heartbeats?.[0]?.networkType ?? null, appVersion: display.appVersion ?? null,
    })) });
  } catch (error) {
    console.error("[admin/screens] fleet request failed", { requestId, code: error instanceof AdminAuthError ? error.code : "BACKEND_FAILURE", errorType: error instanceof Error ? error.name : "unknown" });
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { code: error instanceof AdminAuthError ? error.code : "ADMIN_BACKEND_UNAVAILABLE", message: status === 401 ? "Admin session expired. Sign in again." : status === 403 ? "Admin access denied." : "Screen fleet service unavailable. Retry or contact operations." }, requestId }, { status });
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
