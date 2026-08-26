export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "VIEWER";
export type ScreenType = "AUTO_SCREEN" | "CAB_SCREEN" | "RETAIL_SCREEN" | "BILLBOARD_SCREEN" | "OTHER";
export type PairingStatus = "UNPAIRED" | "PAIRING_CODE_ACTIVE" | "PAIRING" | "PAIRED" | "PAIRING_FAILED" | "PAIRING_EXPIRED";
export type ConnectivityStatus = "ONLINE" | "STALE" | "OFFLINE" | "NEVER_CONNECTED";
export type PlayerStatus = "STARTING" | "SYNCING" | "READY" | "PLAYING" | "FALLBACK" | "OFFLINE_PLAYBACK" | "ERROR";
export type ManifestStatus = "CURRENT" | "DOWNLOADING" | "PENDING_ACTIVATION" | "OUTDATED" | "ERROR";
export type HealthSeverity = "HEALTHY" | "INFO" | "WARNING" | "CRITICAL";
export type NetworkType = "WIFI" | "CELLULAR" | "ETHERNET" | "OFFLINE" | "UNKNOWN";

export interface AdminUser { id: string; name: string; role: AdminRole }
export interface Screen {
  screenId: string; deviceId: string; screenName: string; inventoryId?: string; vehicleId?: string;
  screenType: ScreenType; city: string; area: string; createdAt: string; pairedAt?: string; pairingStatus: PairingStatus;
}
export interface DeviceHeartbeat {
  id: string; screenId: string; deviceId: string; timestamp: string; appVersion: string; appVersionCode?: number;
  androidVersion: string; manufacturer: string; model: string; networkType: NetworkType; networkConnected: boolean;
  signalStrength?: number; freeStorageBytes?: number; totalStorageBytes?: number; currentCampaignId?: string;
  currentCreativeId?: string; currentCreativeName?: string; currentCampaignName?: string; playbackStartedAt?: string;
  expectedDurationSeconds?: number; manifestVersion?: number; kioskActive?: boolean; deviceOwner?: boolean;
  playerState: PlayerStatus; syncState?: string; lastManifestSync?: string; availableAssetCount?: number;
  pendingAssetCount?: number; failedAssetCount?: number; errorMessage?: string;
}
export interface HealthIssue { code: string; label: string; severity: HealthSeverity; detail: string }
export interface DeviceHealth extends DeviceHeartbeat { connectivity: ConnectivityStatus; issues: HealthIssue[]; storageHealth: "NORMAL" | "LOW" | "CRITICAL" | "UNKNOWN" }
export interface DeviceActivity { id: string; screenId: string; type: string; timestamp: string; detail?: string }
export interface PairingCode { code: string; screenId: string; status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED"; expiresAt: string; createdAt: string }
export interface CreateScreenInput { screenName: string; screenType: ScreenType; city: string; area: string; vehicleId?: string; inventoryId?: string; notes?: string }
export interface DeviceCommand { id: string; screenId: string; type: "SYNC_NOW" | "REFRESH_MANIFEST" | "RESTART_PLAYER" | "REBOOT_DEVICE" | "UNPAIR"; status: "QUEUED" | "DELIVERED" | "ACKNOWLEDGED" | "SUCCESS" | "FAILED" | "EXPIRED"; createdAt: string }
export interface ScreenFilters { search?: string; status?: ConnectivityStatus; pairing?: PairingStatus; screenType?: ScreenType; city?: string; area?: string; appVersion?: string; manifestVersion?: string; issuesOnly?: boolean; sort?: "heartbeat" | "name" | "app" | "storage" | "created" | "status" }
