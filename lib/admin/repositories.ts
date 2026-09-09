import { deriveHealth, fleetHealth } from "./health";
import type { CreateScreenInput, DeviceActivity, DeviceCommand, DeviceHeartbeat, DeviceHealth, PairingCode, Screen, ScreenFilters } from "./types";

export interface ScreenRepository { listScreens(filters?: ScreenFilters): Promise<Screen[]>; getScreen(id: string): Promise<Screen | null>; createScreen(input: CreateScreenInput): Promise<Screen> }
export interface DeviceHealthRepository { getLatestHealth(screenId: string): Promise<DeviceHealth | null>; getFleetHealth(): Promise<{ screens: DeviceHealth[]; summary: ReturnType<typeof fleetHealth> }>; getHeartbeatHistory(screenId: string, limit?: number): Promise<DeviceHeartbeat[]>; getActivity(screenId: string, limit?: number): Promise<DeviceActivity[]> }
export interface PairingRepository { getActiveCode(screenId: string): Promise<PairingCode | null>; createCode(screenId: string): Promise<PairingCode>; revokeCode(code: string): Promise<void> }
export interface DeviceCommandRepository { createCommand(screenId: string, type: DeviceCommand["type"]): Promise<DeviceCommand>; getLatestCommand(screenId: string): Promise<DeviceCommand | null> }

// Fixtures are useful while developing the admin UI, but must never be able to
// replace live device data in a production build, even if an environment
// variable is accidentally carried into deployment.
export const isMockDeviceData = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEVICE_DATA_SOURCE === "mock";

const now = Date.now();
const mockScreens: Screen[] = [
  { screenId: "screen-014", deviceId: "ooro-8c17a2", screenName: "Screen 014", screenType: "AUTO_SCREEN", city: "Bengaluru", area: "Koramangala", vehicleId: "KA-01-AB-014", inventoryId: "INV-014", createdAt: new Date(now - 86400000 * 18).toISOString(), pairedAt: new Date(now - 86400000 * 17).toISOString(), pairingStatus: "PAIRED" },
  { screenId: "screen-022", deviceId: "ooro-4fd912", screenName: "Screen 022", screenType: "CAB_SCREEN", city: "Bengaluru", area: "Indiranagar", createdAt: new Date(now - 86400000 * 7).toISOString(), pairedAt: new Date(now - 86400000 * 6).toISOString(), pairingStatus: "PAIRED" },
  { screenId: "screen-031", deviceId: "ooro-1b390e", screenName: "Screen 031", screenType: "RETAIL_SCREEN", city: "Hyderabad", area: "Banjara Hills", createdAt: new Date(now - 86400000 * 2).toISOString(), pairingStatus: "UNPAIRED" },
];
const mockHeartbeats: DeviceHeartbeat[] = [
  { id: "hb-014", screenId: "screen-014", deviceId: "ooro-8c17a2", timestamp: new Date(now - 12000).toISOString(), appVersion: "1.0.4", appVersionCode: 104, androidVersion: "12", manufacturer: "T95", model: "Android Box", networkType: "WIFI", networkConnected: true, signalStrength: -54, freeStorageBytes: 18.4 * 1024 ** 3, totalStorageBytes: 32 * 1024 ** 3, currentCampaignId: "campaign-summer", currentCreativeId: "creative-summer", currentCreativeName: "Summer Launch", currentCampaignName: "Summer Launch", playbackStartedAt: new Date(now - 120000).toISOString(), expectedDurationSeconds: 15, manifestVersion: 42, kioskActive: true, deviceOwner: true, playerState: "PLAYING", syncState: "CURRENT", lastManifestSync: new Date(now - 360000).toISOString(), availableAssetCount: 8, pendingAssetCount: 0, failedAssetCount: 0 },
  { id: "hb-022", screenId: "screen-022", deviceId: "ooro-4fd912", timestamp: new Date(now - 145000).toISOString(), appVersion: "1.0.3", appVersionCode: 103, androidVersion: "11", manufacturer: "AOSP", model: "Cab Display", networkType: "CELLULAR", networkConnected: true, freeStorageBytes: 3.2 * 1024 ** 3, totalStorageBytes: 32 * 1024 ** 3, manifestVersion: 41, kioskActive: true, deviceOwner: true, playerState: "OFFLINE_PLAYBACK", syncState: "CURRENT", availableAssetCount: 5, pendingAssetCount: 0, failedAssetCount: 0 },
];
const mockActivity: DeviceActivity[] = [{ id: "activity-1", screenId: "screen-014", type: "CREATIVE_STARTED", timestamp: new Date(now - 120000).toISOString(), detail: "Summer Launch" }, { id: "activity-2", screenId: "screen-014", type: "MANIFEST_SYNCED", timestamp: new Date(now - 360000).toISOString(), detail: "Manifest v42 activated" }, { id: "activity-3", screenId: "screen-014", type: "DEVICE_ONLINE", timestamp: new Date(now - 720000).toISOString(), detail: "Wi-Fi" }];
const pairingCodes: PairingCode[] = [];

function matchFilters(screen: Screen, filters: ScreenFilters, heartbeat?: DeviceHeartbeat) {
  const query = filters.search?.trim().toLowerCase();
  if (query && ![screen.screenName, screen.screenId, screen.deviceId, screen.vehicleId, screen.city, screen.area].some(value => value?.toLowerCase().includes(query))) return false;
  if (filters.pairing && screen.pairingStatus !== filters.pairing) return false;
  if (filters.screenType && screen.screenType !== filters.screenType) return false;
  if (filters.city && screen.city !== filters.city) return false;
  if (filters.area && screen.area !== filters.area) return false;
  if (filters.appVersion && heartbeat?.appVersion !== filters.appVersion) return false;
  if (filters.manifestVersion && String(heartbeat?.manifestVersion ?? "") !== filters.manifestVersion) return false;
  if (filters.issuesOnly && !deriveHealth(heartbeat)?.issues.length) return false;
  return true;
}

class MockScreenRepository implements ScreenRepository {
  async listScreens(filters: ScreenFilters = {}) { let result = mockScreens.filter(screen => matchFilters(screen, filters, mockHeartbeats.find(item => item.screenId === screen.screenId))); if (filters.status) result = result.filter(screen => { const heartbeat = mockHeartbeats.find(item => item.screenId === screen.screenId); return deriveHealth(heartbeat)?.connectivity === filters.status || (!heartbeat && filters.status === "NEVER_CONNECTED"); }); const direction = filters.sort === "name" ? (a: Screen, b: Screen) => a.screenName.localeCompare(b.screenName) : (a: Screen, b: Screen) => a.createdAt.localeCompare(b.createdAt); return result.sort(direction); }
  async getScreen(id: string) { return mockScreens.find(screen => screen.screenId === id) ?? null; }
  async createScreen(input: CreateScreenInput) { const screen: Screen = { ...input, screenId: `screen-${String(mockScreens.length + 14).padStart(3, "0")}`, deviceId: `pending-${Date.now()}`, createdAt: new Date().toISOString(), pairingStatus: "PAIRING_CODE_ACTIVE" }; mockScreens.push(screen); return screen; }
}
class LiveScreenRepository implements ScreenRepository {
  async listScreens() { const response = await fetch("/api/admin/screens", { cache: "no-store" }); if (!response.ok) throw new Error("Unable to load screens"); const payload = await response.json(); return (payload.data ?? []) as Screen[]; }
  async getScreen(id: string) { const screens = await this.listScreens(); return screens.find(screen => screen.screenId === id) ?? null; }
  async createScreen(input: CreateScreenInput): Promise<Screen> { void input; throw new Error("Use the admin screen creation route"); }
}
class MockDeviceHealthRepository implements DeviceHealthRepository {
  async getLatestHealth(screenId: string) { return deriveHealth(mockHeartbeats.find(item => item.screenId === screenId)); }
  async getFleetHealth() { const screens = mockHeartbeats.map(heartbeat => deriveHealth(heartbeat)).filter((item): item is DeviceHealth => Boolean(item)); return { screens, summary: fleetHealth(screens) }; }
  async getHeartbeatHistory(screenId: string, limit = 10) { return mockHeartbeats.filter(item => item.screenId === screenId).slice(0, limit); }
  async getActivity(screenId: string, limit = 10) { return mockActivity.filter(item => item.screenId === screenId).slice(0, limit); }
}
class LiveDeviceHealthRepository implements DeviceHealthRepository {
  async getLatestHealth(screenId: string) { const payload = await this.read(screenId); return payload.health as DeviceHealth | null; }
  async getFleetHealth() { const screens = await screenRepository.listScreens(); const health = await Promise.all(screens.map(screen => this.getLatestHealth(screen.screenId))); const current = health.filter((item): item is DeviceHealth => Boolean(item)); return { screens: current, summary: fleetHealth(current) }; }
  async getHeartbeatHistory(screenId: string) { return (await this.read(screenId)).history as DeviceHeartbeat[]; }
  async getActivity() { return []; }
  private async read(screenId: string) { const response = await fetch(`/api/admin/screens/${screenId}/health`, { cache: "no-store" }); if (!response.ok) throw new Error("Unable to load device health"); const payload = await response.json(); return payload.data ?? { health: null, history: [] }; }
}
class MockPairingRepository implements PairingRepository {
  async getActiveCode(screenId: string) { return pairingCodes.find(code => code.screenId === screenId && code.status === "ACTIVE") ?? null; }
  async createCode(screenId: string) { const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; const bytes = new Uint8Array(6); crypto.getRandomValues(bytes); const code = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join(""); const pairingCode: PairingCode = { code, screenId, status: "ACTIVE", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }; pairingCodes.push(pairingCode); return pairingCode; }
  async revokeCode(code: string) { const match = pairingCodes.find(item => item.code === code); if (match) match.status = "REVOKED"; }
}
class LivePairingRepository implements PairingRepository {
  async getActiveCode() { return null; }
  async createCode(screenId: string) { const response = await fetch(`/api/admin/screens/${screenId}/pairing-code`, { method: "POST" }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error?.message || "Unable to generate pairing code"); return payload.data as PairingCode; }
  async revokeCode() { return; }
}
class MockCommandRepository implements DeviceCommandRepository { async createCommand(screenId: string, type: DeviceCommand["type"]) { return { id: `command-${Date.now()}`, screenId, type, status: "QUEUED" as const, createdAt: new Date().toISOString() }; } async getLatestCommand() { return null; } }
class LiveCommandRepository implements DeviceCommandRepository { async createCommand(screenId: string, type: DeviceCommand["type"]) { const response = await fetch(`/api/admin/screens/${screenId}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commandType: type }) }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error?.message || "Unable to queue display command"); const command = payload.data ?? payload; return { id: command.id, screenId, type: command.commandType as DeviceCommand["type"], status: command.status as DeviceCommand["status"], createdAt: command.createdAt }; } async getLatestCommand(screenId: string) { const response = await fetch(`/api/admin/screens/${screenId}/commands`, { cache: "no-store" }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error?.message || "Unable to load display commands"); const command = payload.data?.[0]; return command ? { id: command.id, screenId, type: command.commandType as DeviceCommand["type"], status: command.status as DeviceCommand["status"], createdAt: command.createdAt } : null; } }

export const screenRepository: ScreenRepository = isMockDeviceData ? new MockScreenRepository() : new LiveScreenRepository();
export const deviceHealthRepository: DeviceHealthRepository = isMockDeviceData ? new MockDeviceHealthRepository() : new LiveDeviceHealthRepository();
export const pairingRepository: PairingRepository = isMockDeviceData ? new MockPairingRepository() : new LivePairingRepository();
export const deviceCommandRepository: DeviceCommandRepository = isMockDeviceData ? new MockCommandRepository() : new LiveCommandRepository();
