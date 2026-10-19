package com.ooro.screenplayer.model

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

enum class PlayerStatus { UNPAIRED, SYNCING, READY, PLAYING, OFFLINE, DEGRADED, ERROR }
enum class CreativeType { IMAGE, VIDEO }
enum class FitMode { FIT, FILL, CENTER_CROP }
enum class DisplayLayout { FULLSCREEN_AD, FOUR_ZONE, AD_NAV_OFFER, SPLIT_50_25_25, FULLSCREEN_SERVICE, SPECIAL_CAMPAIGN }
enum class CtaType { WEBSITE, MENU, COUPON, WHATSAPP, CALL, DIRECTIONS, APP_DOWNLOAD, LEAD_FORM }

data class OfferMetadata(
    val brandName: String? = null,
    val promotionalText: String? = null,
    val offerTitle: String? = null,
    val offerSubtitle: String? = null,
    val offerValue: String? = null,
    val ctaType: CtaType? = null,
    val ctaLabel: String? = null,
    val ctaUrl: String? = null,
    val qrUrl: String? = null,
    val secondaryCtaLabel: String? = null,
    val secondaryCtaUrl: String? = null,
    val contactPhone: String? = null,
    val contactUrl: String? = null,
    val scanCount: Int? = null,
    val scanCountDisplayEnabled: Boolean = false,
    val accentColor: String? = null
) {
    val validQrUrl: String? get() = (qrUrl ?: ctaUrl)?.takeIf { it.startsWith("https://") || it.startsWith("http://") }
    val hasOffer: Boolean get() = listOf(brandName, offerTitle, offerValue, offerSubtitle, ctaLabel).any { !it.isNullOrBlank() }
}

data class DeviceCredentials(val deviceId: String, val screenId: String, val workspaceId: String, val token: String, val name: String)
data class PairRequest(val pairingCode: String, val deviceId: String, val manufacturer: String, val model: String, val androidVersion: String, val appVersion: String)
data class PairResponse(val credentials: DeviceCredentials)
data class ManifestItem(val id: String, val campaignId: String, val creativeId: String, val type: CreativeType, val url: String, val checksum: String?, val durationSeconds: Int, val priority: Int, val startAt: Instant?, val endAt: Instant?, val daysOfWeek: Set<DayOfWeek>, val startTime: LocalTime?, val endTime: LocalTime?, val assetId: String? = null, val fitMode: FitMode = FitMode.FIT, val offer: OfferMetadata = OfferMetadata(), val playsPerLoop: Int = 1, val exclusive: Boolean = false, val sequence: Int = 0, val intervalSeconds: Double = 0.0, val scheduleId: String? = null) {
    val qrEnabled: Boolean get() = offer.validQrUrl != null
    fun isActive(now: Instant, zone: ZoneId): Boolean {
        val local = now.atZone(zone)
        if (startAt != null && now.isBefore(startAt)) return false
        if (endAt != null && !now.isBefore(endAt)) return false
        if (daysOfWeek.isNotEmpty() && local.dayOfWeek !in daysOfWeek) return false
        val time = local.toLocalTime()
        return when {
            startTime == null || endTime == null -> true
            startTime <= endTime -> time >= startTime && time < endTime
            else -> time >= startTime || time < endTime
        }
    }
}
data class LayoutConfig(val primaryWidthPercent: Int = 67, val adHeightPercent: Int = 89, val qrHeightPercent: Int = 32, val newsScrollSpeed: Int = 42) {
    val safePrimaryWidth: Int get() = primaryWidthPercent.coerceIn(55, 80)
    val safeAdHeight: Int get() = adHeightPercent.coerceIn(88, 92)
    val safeQrHeight: Int get() = qrHeightPercent.coerceIn(30, 35)
    val safeNewsScrollSpeed: Int get() = newsScrollSpeed.coerceIn(10, 120)
}
data class NewsAnnouncement(val id: String, val text: String, val priority: Int = 0)
data class NewsConfig(val scrollSpeed: Int = 42, val announcements: List<NewsAnnouncement> = emptyList())
data class DeviceManifest(val version: Long, val screenId: String, val timezone: String, val items: List<ManifestItem>, val validUntil: Instant?, val layout: DisplayLayout = DisplayLayout.FULLSCREEN_AD, val layoutConfig: LayoutConfig = LayoutConfig(), val news: NewsConfig = NewsConfig())
data class ProofOfPlay(val eventId: String = UUID.randomUUID().toString(), val screenId: String, val deviceId: String, val campaignId: String, val creativeId: String, val scheduleItemId: String, val startedAt: Instant, val endedAt: Instant, val expectedDurationMs: Long = 0, val actualPlayedMs: Long = 0, val success: Boolean = true, val failureReason: String? = null, val appVersion: String, val assetId: String? = null)

data class PlaybackSession(val eventId: String, val itemId: String, val campaignId: String, val creativeId: String, val assetId: String?, val startedAt: Instant, val expectedDurationMs: Long)
data class HeartbeatTelemetry(val location: com.ooro.screenplayer.location.LocationSnapshot? = null, val campaignId: String? = null, val creativeId: String? = null, val assetId: String? = null, val playbackState: String? = null, val playbackStartedAt: Instant? = null, val playbackPositionMs: Long? = null, val expectedDurationMs: Long? = null)
data class NavigationState(val active: Boolean = false, val destinationName: String? = null, val destinationLatitude: Double? = null, val destinationLongitude: Double? = null, val currentLatitude: Double? = null, val currentLongitude: Double? = null, val etaSeconds: Long? = null, val remainingDistanceMeters: Double? = null, val nextInstruction: String? = null, val nextManeuver: String? = null, val distanceToNextManeuverMeters: Double? = null, val routePolyline: String? = null, val updatedAt: Instant? = null)
data class RideNavigationState(val currentLatitude: Double? = null, val currentLongitude: Double? = null, val destinationName: String? = null, val etaMinutes: Int? = null, val distanceRemainingKm: Double? = null, val routePolyline: String? = null)
enum class UtilityWidgetType { CLOCK, RIDE_STATUS, QR_OFFER, SAFETY, CITY_INFO, WEATHER, SPONSORED_OFFER }
