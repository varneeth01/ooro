package com.ooro.screenplayer

import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.player.ScheduleEngine
import com.ooro.screenplayer.model.CreativeType
import com.ooro.screenplayer.model.DisplayLayout
import java.time.Duration
import java.time.Instant

internal const val MANIFEST_REFRESH_LEAD_MILLIS = 120_000L
internal const val NETWORK_RECOVERY_THROTTLE_MILLIS = 30_000L

internal fun shouldRefreshAfterNetworkRecovery(nowElapsedMillis: Long, lastRefreshElapsedMillis: Long): Boolean =
    lastRefreshElapsedMillis <= 0L || nowElapsedMillis - lastRefreshElapsedMillis >= NETWORK_RECOVERY_THROTTLE_MILLIS

internal fun syncRetryDelayMillis(attempt: Int, jitterMillis: Long): Long {
    val exponent = attempt.coerceIn(1, 8)
    val baseMillis = (1L shl exponent).coerceAtMost(300L) * 1_000L
    return baseMillis + jitterMillis.coerceIn(0L, 999L)
}

/** A cached manifest is usable only inside the server-issued authorization window. */
internal fun manifestIsAuthorizedAt(manifest: DeviceManifest, now: Instant): Boolean =
    manifest.validUntil?.isAfter(now) == true

/** Refresh before the server lease ends; this never extends the authorization window. */
internal fun manifestRefreshDelayMillis(
    validUntil: Instant?,
    now: Instant,
    leadMillis: Long = MANIFEST_REFRESH_LEAD_MILLIS,
): Long? {
    if (leadMillis < 0 || validUntil == null || !validUntil.isAfter(now)) return null
    return (Duration.between(now, validUntil).toMillis() - leadMillis).coerceAtLeast(0L)
}

/** Never publish a playlist until every URL-bearing item has a verified local asset. */
internal fun canCommitDownloadedManifest(requiredCount: Int, verifiedCount: Int): Boolean =
    requiredCount >= 0 && requiredCount == verifiedCount

internal fun canCommitManifestResponse(
    manifest: DeviceManifest,
    requiredCount: Int,
    verifiedCount: Int,
    now: Instant,
): Boolean = manifestIsAuthorizedAt(manifest, now) && canCommitDownloadedManifest(requiredCount, verifiedCount)

internal fun retainedAssetIds(requiredIds: Set<String>, currentlyPlayingItemId: String?): Set<String> =
    if (currentlyPlayingItemId == null) requiredIds else requiredIds + currentlyPlayingItemId

internal fun nextVerifiedManifestItem(
    manifest: DeviceManifest,
    scheduler: ScheduleEngine,
    now: Instant,
    offset: Int,
    verifiedItemIds: Set<String>,
): ManifestItem? {
    if (!manifestIsAuthorizedAt(manifest, now)) return null
    return scheduler.next(manifest, now, offset, verifiedItemIds)
}

internal enum class CachedStartupBlock {
    NONE,
    NO_MANIFEST,
    UNPAIRED,
    SCREEN_ID_MISMATCH,
    AUTHORIZATION_EXPIRED,
    NO_ELIGIBLE_VERIFIED_ASSET,
}

internal data class CachedStartupResolution(
    /** Null means the cached manifest must not be rendered for this device identity. */
    val manifest: DeviceManifest?,
    val firstItem: ManifestItem?,
    val block: CachedStartupBlock,
)

/** Resolves the persisted playlist without any network access or proof side effects. */
internal fun resolveCachedStartup(
    manifest: DeviceManifest?,
    pairedScreenId: String?,
    verifiedItemIds: Set<String>,
    scheduler: ScheduleEngine,
    now: Instant,
): CachedStartupResolution {
    if (manifest == null) return CachedStartupResolution(null, null, CachedStartupBlock.NO_MANIFEST)
    if (pairedScreenId == null) return CachedStartupResolution(null, null, CachedStartupBlock.UNPAIRED)
    if (manifest.screenId != pairedScreenId) return CachedStartupResolution(null, null, CachedStartupBlock.SCREEN_ID_MISMATCH)
    if (!manifestIsAuthorizedAt(manifest, now)) return CachedStartupResolution(manifest, null, CachedStartupBlock.AUTHORIZATION_EXPIRED)
    val firstItem = nextVerifiedManifestItem(manifest, scheduler, now, 0, verifiedItemIds)
    return if (firstItem == null) CachedStartupResolution(manifest, null, CachedStartupBlock.NO_ELIGIBLE_VERIFIED_ASSET)
    else CachedStartupResolution(manifest, firstItem, CachedStartupBlock.NONE)
}

internal fun eligibleSponsoredItem(manifest: DeviceManifest, now: Instant, verifiedItemIds: Set<String>): ManifestItem? {
    if (manifest.layoutContractVersion < 3 || manifest.layout !in setOf(DisplayLayout.FOUR_ZONE, DisplayLayout.AD_NAV_OFFER) || !manifestIsAuthorizedAt(manifest, now)) return null
    val item = manifest.sponsoredItem ?: return null
    if (item.type != CreativeType.IMAGE || item.id !in verifiedItemIds) return null
    val zone = runCatching { java.time.ZoneId.of(manifest.timezone) }.getOrNull() ?: return null
    return item.takeIf { it.isActive(now, zone) }
}

internal fun acknowledgedProofEventIds(selectedIds: Set<String>, serverAcceptedIds: Set<String>): Set<String> =
    selectedIds intersect serverAcceptedIds
