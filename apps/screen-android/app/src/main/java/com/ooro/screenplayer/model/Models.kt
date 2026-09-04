package com.ooro.screenplayer.model

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

enum class PlayerStatus { UNPAIRED, SYNCING, READY, PLAYING, OFFLINE, DEGRADED, ERROR }
enum class CreativeType { IMAGE, VIDEO }
enum class FitMode { FIT, FILL, CENTER_CROP }
enum class DisplayLayout { FULLSCREEN_AD, SPLIT_50_25_25, FULLSCREEN_SERVICE, SPECIAL_CAMPAIGN }

data class DeviceCredentials(val deviceId: String, val screenId: String, val workspaceId: String, val token: String, val name: String)
data class PairRequest(val pairingCode: String, val deviceId: String, val manufacturer: String, val model: String, val androidVersion: String, val appVersion: String)
data class PairResponse(val credentials: DeviceCredentials)
data class ManifestItem(val id: String, val campaignId: String, val creativeId: String, val type: CreativeType, val url: String, val checksum: String?, val durationSeconds: Int, val priority: Int, val startAt: Instant?, val endAt: Instant?, val daysOfWeek: Set<DayOfWeek>, val startTime: LocalTime?, val endTime: LocalTime?) {
    fun isActive(now: Instant, zone: ZoneId): Boolean {
        val local = now.atZone(zone)
        if (startAt != null && now.isBefore(startAt)) return false
        if (endAt != null && now.isAfter(endAt)) return false
        if (daysOfWeek.isNotEmpty() && local.dayOfWeek !in daysOfWeek) return false
        val time = local.toLocalTime()
        return when {
            startTime == null || endTime == null -> true
            startTime <= endTime -> time >= startTime && time <= endTime
            else -> time >= startTime || time <= endTime
        }
    }
}
data class DeviceManifest(val version: Long, val screenId: String, val timezone: String, val items: List<ManifestItem>, val validUntil: Instant?, val layout: DisplayLayout = DisplayLayout.FULLSCREEN_AD)
data class ProofOfPlay(val eventId: String = UUID.randomUUID().toString(), val screenId: String, val deviceId: String, val campaignId: String, val creativeId: String, val scheduleItemId: String, val startedAt: Instant, val endedAt: Instant, val expectedDurationMs: Long = 0, val actualPlayedMs: Long = 0, val success: Boolean = true, val failureReason: String? = null, val appVersion: String)

data class PlaybackSession(val eventId: String, val campaignId: String, val creativeId: String, val assetId: String, val startedAt: Instant, val expectedDurationMs: Long)
data class RideNavigationState(val currentLatitude: Double? = null, val currentLongitude: Double? = null, val destinationName: String? = null, val etaMinutes: Int? = null, val distanceRemainingKm: Double? = null, val routePolyline: String? = null)
enum class UtilityWidgetType { CLOCK, RIDE_STATUS, QR_OFFER, SAFETY, CITY_INFO, WEATHER, SPONSORED_OFFER }
