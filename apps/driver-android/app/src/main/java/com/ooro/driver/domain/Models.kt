package com.ooro.driver.domain

import java.time.Instant
import java.util.UUID

enum class DriverType { INDIVIDUAL, FLEET_OWNER }
enum class VerificationStatus { NOT_STARTED, PENDING, VERIFIED, REJECTED, EXPIRED }
enum class VehicleType { AUTO, CAB, RETAIL, OTHER }
enum class DisplayOwnershipType { OWN, SHARED_RENTED, COMPANY_OWNED }
enum class ConnectivityStatus { ONLINE, STALE, OFFLINE, NEVER_CONNECTED }
enum class DisplayState { UNPAIRED, PAIRING, IDLE_SLEEP, WAKING, ACTIVE_PLAYBACK, ENDING_SESSION, OFFLINE, ERROR }
enum class PlayerStatus { STARTING, SYNCING, READY, PLAYING, FALLBACK, OFFLINE_PLAYBACK, ERROR }
enum class RideEventType { RIDE_REQUESTED, RIDE_ACCEPTED, DRIVER_TO_PICKUP, ARRIVED_PICKUP, PICKUP_DETECTED, PASSENGER_PICKED_UP, RIDE_ACTIVE, RIDE_CANCELLED, RIDE_COMPLETED, UNKNOWN }
enum class RideState { IDLE, RIDE_ACCEPTED, TO_PICKUP, PICKUP_DETECTED, VERIFYING, ACTIVE_VERIFIED, ARRIVING, ENDING, COMPLETED, PAYMENT_PENDING, PAYABLE, PAID, CANCELLED, SUSPICIOUS, REJECTED, MANUAL_REVIEW, FAILED }
enum class VerificationStatusV2 { VERIFIED, SUSPICIOUS, REJECTED }
enum class VerificationReason { NORMAL_EVENT_SEQUENCE, VALID_MOVEMENT, DISPLAY_ACTIVE, GPS_CONSISTENT, IMPOSSIBLE_MOVEMENT, MOCK_LOCATION_SUSPECTED, CANCELLATION_CONFLICT, ABNORMAL_RIDE_DURATION, NO_MOVEMENT, DISPLAY_OFFLINE }
enum class NetworkType { WIFI, CELLULAR, ETHERNET, OFFLINE, UNKNOWN }
enum class PayoutStatus { REQUESTED, PROCESSING, COMPLETED, FAILED, REVERSED }
enum class LedgerEntryType { RIDE_EARNING, AD_EARNING, BONUS, ADJUSTMENT, REVERSAL, PAYOUT, PAYOUT_FEE }

data class DriverProfile(val id: String, val fullName: String, val phone: String, val email: String? = null, val city: String? = null, val language: String = "English", val driverType: DriverType = DriverType.INDIVIDUAL, val kycStatus: VerificationStatus = VerificationStatus.NOT_STARTED)
data class Vehicle(val id: String, val driverId: String, val type: VehicleType, val registrationNumber: String, val manufacturer: String, val model: String, val year: Int? = null, val fuelType: String? = null, val ownership: DisplayOwnershipType? = null, val verificationStatus: VerificationStatus = VerificationStatus.PENDING)
data class DisplayBinding(val displayId: String, val vehicleId: String, val name: String, val state: DisplayState, val lastSeen: Instant? = null, val appVersion: String? = null, val manifestVersion: Long? = null, val currentCreativeId: String? = null, val freeStorageBytes: Long? = null, val networkType: NetworkType = NetworkType.UNKNOWN)
data class NormalizedRideEvent(val eventId: String = UUID.randomUUID().toString(), val provider: String, val eventType: RideEventType, val timestamp: Instant = Instant.now(), val confidence: Double, val sourcePackage: String? = null)
data class LocationSample(val id: String = UUID.randomUUID().toString(), val rideId: String, val timestamp: Instant, val latitude: Double, val longitude: Double, val accuracyMeters: Float, val speedMps: Float?, val bearing: Float?, val source: String = "FUSED")
data class VerificationResult(val score: Int, val status: VerificationStatusV2, val reasons: Set<VerificationReason>)
data class RideCandidate(val id: String = UUID.randomUUID().toString(), val provider: String, val state: RideState = RideState.IDLE, val createdAt: Instant = Instant.now(), val pickupAt: Instant? = null, val completedAt: Instant? = null, val verification: VerificationResult? = null, val distanceMeters: Double = 0.0, val verifiedAdSeconds: Long = 0, val campaignSessionId: String? = null)
data class ProofOfPlay(val proofId: String = UUID.randomUUID().toString(), val rideId: String, val driverId: String, val vehicleId: String, val displayId: String, val campaignId: String, val creativeId: String, val playbackStartedAt: Instant, val playbackEndedAt: Instant?, val expectedDurationSeconds: Int, val actualDurationSeconds: Int?, val manifestVersion: Long?, val playerVersion: String, val playbackCompleted: Boolean, val playbackError: String? = null, val displayHeartbeatId: String? = null)
data class EarningEntry(val id: String = UUID.randomUUID().toString(), val driverId: String, val rideId: String? = null, val type: LedgerEntryType, val amountMinor: Long, val currency: String = "INR", val status: String = "PENDING", val createdAt: Instant = Instant.now())
