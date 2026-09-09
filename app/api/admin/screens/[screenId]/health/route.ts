import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";
import { deriveHealth } from "@/lib/admin/health";

export async function GET(_request: Request, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const { screenId } = await params;
    const response = await proxyAdminRequest(`/api/displays/${screenId}/status`);
    const payload = await response.json().catch(() => ({ data: null }));
    if (!response.ok) return NextResponse.json(payload, { status: response.status });
    const display = payload.data;
    const heartbeat = display?.lastHeartbeat ? {
      id: display.lastHeartbeat.id, screenId, deviceId: display.deviceId,
      timestamp: display.lastHeartbeat.occurredAt, appVersion: display.lastHeartbeat.appVersion ?? "—",
      androidVersion: display.lastHeartbeat.deviceVersion ?? "—", manufacturer: "—", model: "—",
      networkType: display.lastHeartbeat.networkType ?? "UNKNOWN", networkConnected: display.lastHeartbeat.networkConnected ?? false,
      freeStorageBytes: display.lastHeartbeat.storageFree ? Number(display.lastHeartbeat.storageFree) : undefined,
      totalStorageBytes: display.lastHeartbeat.storageTotal ? Number(display.lastHeartbeat.storageTotal) : undefined,
      currentCreativeId: display.lastHeartbeat.currentCreativeId, manifestVersion: display.lastHeartbeat.manifestVersion,
      playerState: display.lastHeartbeat.playbackState ?? display.lastHeartbeat.screenState ?? "READY",
      kioskActive: undefined, deviceOwner: undefined,
    } : undefined;
    return NextResponse.json({ data: { health: deriveHealth(heartbeat), history: heartbeat ? [heartbeat] : [], activity: [] } });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { code: error instanceof AdminAuthError ? error.code : "ADMIN_BACKEND_UNAVAILABLE", message: "Unable to load device health" } }, { status });
  }
}
