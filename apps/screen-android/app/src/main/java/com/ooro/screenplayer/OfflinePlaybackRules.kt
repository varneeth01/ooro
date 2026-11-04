package com.ooro.screenplayer

import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.player.ScheduleEngine
import java.time.Duration
import java.time.Instant

internal const val MANIFEST_REFRESH_LEAD_MILLIS = 120_000L

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

internal fun acknowledgedProofEventIds(selectedIds: Set<String>, serverAcceptedIds: Set<String>): Set<String> =
    selectedIds intersect serverAcceptedIds
