export type DeviceStatus = "UNPAIRED" | "SYNCING" | "READY" | "PLAYING" | "OFFLINE" | "DEGRADED" | "ERROR";

export interface DeviceManifestItem {
  id: string;
  campaignId: string;
  creativeId: string;
  type: "image" | "video";
  url: string;
  checksum?: string;
  durationSeconds?: number;
  priority?: number;
  startAt?: string;
  endAt?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
}

export type DriverType = "INDIVIDUAL" | "FLEET_OWNER";
export type RideEventType = "RIDE_REQUESTED" | "RIDE_ACCEPTED" | "DRIVER_TO_PICKUP" | "ARRIVED_PICKUP" | "PICKUP_DETECTED" | "PASSENGER_PICKED_UP" | "RIDE_ACTIVE" | "RIDE_CANCELLED" | "RIDE_COMPLETED" | "UNKNOWN";
export type RideState = "IDLE" | "RIDE_ACCEPTED" | "TO_PICKUP" | "PICKUP_DETECTED" | "VERIFYING" | "ACTIVE_VERIFIED" | "COMPLETED" | "CANCELLED" | "SUSPICIOUS" | "REJECTED" | "MANUAL_REVIEW";
export type VerificationStatus = "VERIFIED" | "SUSPICIOUS" | "REJECTED";
export interface Driver { id: string; fullName: string; phone: string; driverType: DriverType; kycStatus: string; }
export interface Vehicle { id: string; driverId: string; type: "AUTO" | "CAB" | "RETAIL" | "OTHER"; registrationNumber: string; }
export interface Display { displayId: string; vehicleId: string; state: string; appVersion?: string; manifestVersion?: number; }
export interface RideEvent { eventId: string; rideId?: string; provider: string; eventType: RideEventType; timestamp: string; confidence: number; }
export interface ProofOfPlay { proofId: string; rideId: string; driverId: string; vehicleId: string; displayId: string; campaignId: string; creativeId: string; playbackStartedAt: string; playbackEndedAt?: string; playbackCompleted: boolean; }
export interface DeviceHealth { displayId: string; timestamp: string; networkType: string; playerState: string; freeStorageBytes?: number; manifestVersion?: number; }
