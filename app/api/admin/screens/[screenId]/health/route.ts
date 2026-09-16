import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";
import { deriveHealth } from "@/lib/admin/health";

export async function GET(_request: Request, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const { screenId } = await params;
    const response = await proxyAdminRequest(`/api/admin/displays/${screenId}/live-state`);
    const payload = await response.json().catch(() => ({ data: null }));
    if (!response.ok) return NextResponse.json(payload, { status: response.status });
    const display = payload.data;
    const heartbeat = display?.lastHeartbeat ? {
      id: display.lastHeartbeat.id, screenId, deviceId: display.deviceId,
      timestamp: display.lastHeartbeat.receivedAt ?? display.lastHeartbeat.occurredAt, appVersion: display.lastHeartbeat.appVersion ?? "—",
      networkType: display.lastHeartbeat.networkType ?? "UNKNOWN", networkConnected: display.lastHeartbeat.networkConnected ?? false,
      freeStorageBytes: display.lastHeartbeat.storageFree ? Number(display.lastHeartbeat.storageFree) : undefined,
      totalStorageBytes: display.lastHeartbeat.storageTotal ? Number(display.lastHeartbeat.storageTotal) : undefined,
      currentCampaignId: display.currentCampaignId ?? display.lastHeartbeat.currentCampaignId, currentCreativeId: display.currentCreativeId ?? display.lastHeartbeat.currentCreativeId, currentAssetId: display.currentAssetId ?? display.lastHeartbeat.currentAssetId, playbackStartedAt: display.currentPlaybackStartedAt ?? display.lastHeartbeat.playbackStartedAt, playbackPositionMs: display.currentPlaybackPositionMs ?? display.lastHeartbeat.playbackPositionMs, expectedDurationMs: display.currentExpectedDurationMs ?? display.lastHeartbeat.expectedDurationMs, latitude: display.lastLatitude, longitude: display.lastLongitude, accuracyMeters: display.lastLocationAccuracy, locationOccurredAt: display.lastLocationAt, manifestVersion: display.manifestVersion ?? display.lastHeartbeat.manifestVersion,
      currentCampaignName: display.currentCampaign?.name, currentCreativeName: display.currentCreative?.name, currentCreativeUrl: display.currentCreative?.asset?.url, currentCreativeMimeType: display.currentCreative?.asset?.mimeType, currentCreativeFileName: display.currentCreative?.asset?.fileName,
      manufacturer: display.manufacturer ?? display.lastHeartbeat.manufacturer ?? "—", model: display.model ?? display.lastHeartbeat.model ?? "—", androidVersion: display.androidVersion ?? display.lastHeartbeat.androidVersion ?? display.lastHeartbeat.deviceVersion ?? "—", batteryLevel: display.batteryLevel ?? display.lastHeartbeat.batteryLevel, chargingState: display.chargingState ?? display.lastHeartbeat.chargingState,
      vehicleIdentifier: display.vehicle?.registrationNumber, lastProof: display.lastProof ? { eventType: display.lastProof.eventType, occurredAt: display.lastProof.occurredAt, campaignId: display.lastProof.campaignId, creativeId: display.lastProof.creativeId, playbackCompleted: display.lastProof.playbackCompleted, status: display.lastProof.status } : null,
      connectivity: display.connectivity === "DEGRADED" ? "STALE" : display.connectivity,
      playerState: display.currentPlaybackState ?? display.lastHeartbeat.playbackState ?? display.lastHeartbeat.screenState ?? "READY",
      kioskActive: undefined, deviceOwner: undefined,
    } : undefined;
    return NextResponse.json({ data: { health: deriveHealth(heartbeat), history: heartbeat ? [heartbeat] : [], activity: [] } });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { code: error instanceof AdminAuthError ? error.code : "ADMIN_BACKEND_UNAVAILABLE", message: "Unable to load device health" } }, { status });
  }
}
