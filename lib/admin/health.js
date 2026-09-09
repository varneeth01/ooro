"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEALTH_CONFIG = void 0;
exports.getDeviceConnectivity = getDeviceConnectivity;
exports.getStorageHealth = getStorageHealth;
exports.deriveHealth = deriveHealth;
exports.fleetHealth = fleetHealth;
exports.HEALTH_CONFIG = { onlineThresholdSeconds: 90, offlineThresholdSeconds: 300, storageLowPercent: 20, storageCriticalPercent: 10 };
function getDeviceConnectivity(lastHeartbeat, now = Date.now()) {
    if (!lastHeartbeat)
        return "NEVER_CONNECTED";
    const age = Math.max(0, (now - new Date(lastHeartbeat).getTime()) / 1000);
    if (age <= exports.HEALTH_CONFIG.onlineThresholdSeconds)
        return "ONLINE";
    if (age <= exports.HEALTH_CONFIG.offlineThresholdSeconds)
        return "STALE";
    return "OFFLINE";
}
function getStorageHealth(free, total) {
    if (!free || !total || total <= 0)
        return "UNKNOWN";
    const percent = (free / total) * 100;
    if (percent < exports.HEALTH_CONFIG.storageCriticalPercent)
        return "CRITICAL";
    if (percent < exports.HEALTH_CONFIG.storageLowPercent)
        return "LOW";
    return "NORMAL";
}
function issue(code, label, severity, detail) { return { code, label, severity, detail }; }
function deriveHealth(heartbeat, now = Date.now()) {
    if (!heartbeat)
        return null;
    const connectivity = getDeviceConnectivity(heartbeat.timestamp, now);
    const storageHealth = getStorageHealth(heartbeat.freeStorageBytes, heartbeat.totalStorageBytes);
    const issues = [];
    if (connectivity === "OFFLINE")
        issues.push(issue("OFFLINE", "Screen offline", "CRITICAL", "Heartbeat is outside the offline threshold."));
    else if (connectivity === "STALE")
        issues.push(issue("STALE_HEARTBEAT", "Heartbeat delayed", "WARNING", "The latest heartbeat is outside the normal window."));
    if (storageHealth === "CRITICAL")
        issues.push(issue("CRITICAL_STORAGE", "Critical storage", "CRITICAL", "Free storage is below the critical threshold."));
    else if (storageHealth === "LOW")
        issues.push(issue("LOW_STORAGE", "Low storage", "WARNING", "Free storage is below the warning threshold."));
    if (heartbeat.manifestVersion === undefined)
        issues.push(issue("NO_MANIFEST", "Manifest unavailable", "WARNING", "The device has not reported a manifest version."));
    if (heartbeat.playerState === "ERROR")
        issues.push(issue("PLAYER_ERROR", "Player error", "CRITICAL", heartbeat.errorMessage || "The player reported an error."));
    if (heartbeat.playerState === "FALLBACK" || heartbeat.playerState === "OFFLINE_PLAYBACK")
        issues.push(issue("FALLBACK_PLAYBACK", "Cached playback", "INFO", "The screen is playing locally cached content."));
    if (heartbeat.kioskActive === false)
        issues.push(issue("KIOSK_INACTIVE", "Kiosk inactive", "WARNING", "Managed kiosk mode is not active."));
    if (heartbeat.deviceOwner === false)
        issues.push(issue("DEVICE_OWNER_MISSING", "Device Owner missing", "WARNING", "The device is not provisioned as Device Owner."));
    return { ...heartbeat, connectivity, storageHealth, issues };
}
function fleetHealth(health) {
    return { healthy: health.filter(item => item.issues.every(issue => issue.severity === "INFO" || issue.severity === "HEALTHY")).length, needsAttention: health.filter(item => item.issues.some(issue => issue.severity === "WARNING")).length, offline: health.filter(item => item.connectivity === "OFFLINE").length, lowStorage: health.filter(item => item.storageHealth === "LOW" || item.storageHealth === "CRITICAL").length, outdatedApp: 0, manifestIssues: health.filter(item => item.manifestVersion === undefined).length, kioskIssues: health.filter(item => item.kioskActive === false || item.deviceOwner === false).length };
}
