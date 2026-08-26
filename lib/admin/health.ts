import type { ConnectivityStatus, DeviceHeartbeat, DeviceHealth, HealthIssue, HealthSeverity } from "./types";

export const HEALTH_CONFIG = { onlineThresholdSeconds: 90, offlineThresholdSeconds: 300, storageLowPercent: 20, storageCriticalPercent: 10 } as const;

export function getDeviceConnectivity(lastHeartbeat: string | undefined, now = Date.now()): ConnectivityStatus {
  if (!lastHeartbeat) return "NEVER_CONNECTED";
  const age = Math.max(0, (now - new Date(lastHeartbeat).getTime()) / 1000);
  if (age <= HEALTH_CONFIG.onlineThresholdSeconds) return "ONLINE";
  if (age <= HEALTH_CONFIG.offlineThresholdSeconds) return "STALE";
  return "OFFLINE";
}

export function getStorageHealth(free?: number, total?: number): DeviceHealth["storageHealth"] {
  if (!free || !total || total <= 0) return "UNKNOWN";
  const percent = (free / total) * 100;
  if (percent < HEALTH_CONFIG.storageCriticalPercent) return "CRITICAL";
  if (percent < HEALTH_CONFIG.storageLowPercent) return "LOW";
  return "NORMAL";
}

function issue(code: string, label: string, severity: HealthSeverity, detail: string): HealthIssue { return { code, label, severity, detail }; }

export function deriveHealth(heartbeat?: DeviceHeartbeat, now = Date.now()): DeviceHealth | null {
  if (!heartbeat) return null;
  const connectivity = getDeviceConnectivity(heartbeat.timestamp, now);
  const storageHealth = getStorageHealth(heartbeat.freeStorageBytes, heartbeat.totalStorageBytes);
  const issues: HealthIssue[] = [];
  if (connectivity === "OFFLINE") issues.push(issue("OFFLINE", "Screen offline", "CRITICAL", "Heartbeat is outside the offline threshold."));
  else if (connectivity === "STALE") issues.push(issue("STALE_HEARTBEAT", "Heartbeat delayed", "WARNING", "The latest heartbeat is outside the normal window."));
  if (storageHealth === "CRITICAL") issues.push(issue("CRITICAL_STORAGE", "Critical storage", "CRITICAL", "Free storage is below the critical threshold."));
  else if (storageHealth === "LOW") issues.push(issue("LOW_STORAGE", "Low storage", "WARNING", "Free storage is below the warning threshold."));
  if (heartbeat.manifestVersion === undefined) issues.push(issue("NO_MANIFEST", "Manifest unavailable", "WARNING", "The device has not reported a manifest version."));
  if (heartbeat.playerState === "ERROR") issues.push(issue("PLAYER_ERROR", "Player error", "CRITICAL", heartbeat.errorMessage || "The player reported an error."));
  if (heartbeat.playerState === "FALLBACK" || heartbeat.playerState === "OFFLINE_PLAYBACK") issues.push(issue("FALLBACK_PLAYBACK", "Cached playback", "INFO", "The screen is playing locally cached content."));
  if (heartbeat.kioskActive === false) issues.push(issue("KIOSK_INACTIVE", "Kiosk inactive", "WARNING", "Managed kiosk mode is not active."));
  if (heartbeat.deviceOwner === false) issues.push(issue("DEVICE_OWNER_MISSING", "Device Owner missing", "WARNING", "The device is not provisioned as Device Owner."));
  return { ...heartbeat, connectivity, storageHealth, issues };
}

export function fleetHealth(health: DeviceHealth[]) {
  return { healthy: health.filter(item => item.issues.every(issue => issue.severity === "INFO" || issue.severity === "HEALTHY")).length, needsAttention: health.filter(item => item.issues.some(issue => issue.severity === "WARNING")).length, offline: health.filter(item => item.connectivity === "OFFLINE").length, lowStorage: health.filter(item => item.storageHealth === "LOW" || item.storageHealth === "CRITICAL").length, outdatedApp: 0, manifestIssues: health.filter(item => item.manifestVersion === undefined).length, kioskIssues: health.filter(item => item.kioskActive === false || item.deviceOwner === false).length };
}
