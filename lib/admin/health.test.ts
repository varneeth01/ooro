import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveHealth, getDeviceConnectivity, getStorageHealth } from "./health";
import type { DeviceHeartbeat } from "./types";

const heartbeat: DeviceHeartbeat = { id: "hb", screenId: "screen", deviceId: "device", timestamp: "2026-08-22T19:00:00.000Z", appVersion: "1.0.0", androidVersion: "12", manufacturer: "AOSP", model: "Box", networkType: "WIFI", networkConnected: true, freeStorageBytes: 30, totalStorageBytes: 100, playerState: "PLAYING" };

describe("device connectivity derivation", () => {
  const now = new Date("2026-08-22T19:00:00.000Z").getTime();
  it("uses the configured online, stale, and offline thresholds", () => { assert.equal(getDeviceConnectivity(heartbeat.timestamp, now), "ONLINE"); assert.equal(getDeviceConnectivity(new Date(now - 91_000).toISOString(), now), "STALE"); assert.equal(getDeviceConnectivity(new Date(now - 301_000).toISOString(), now), "OFFLINE"); });
  it("distinguishes never connected from offline", () => { assert.equal(getDeviceConnectivity(undefined, now), "NEVER_CONNECTED"); });
});

describe("health derivation", () => {
  it("centralizes storage thresholds", () => { assert.equal(getStorageHealth(25, 100), "NORMAL"); assert.equal(getStorageHealth(19, 100), "LOW"); assert.equal(getStorageHealth(9, 100), "CRITICAL"); });
  it("derives issues from actual device state", () => { const health = deriveHealth({ ...heartbeat, freeStorageBytes: 5, totalStorageBytes: 100, playerState: "OFFLINE_PLAYBACK", kioskActive: false, deviceOwner: false }); assert.ok(health?.issues.some(issue => issue.code === "CRITICAL_STORAGE")); assert.ok(health?.issues.some(issue => issue.code === "FALLBACK_PLAYBACK")); assert.ok(health?.issues.some(issue => issue.code === "KIOSK_INACTIVE")); });
});
