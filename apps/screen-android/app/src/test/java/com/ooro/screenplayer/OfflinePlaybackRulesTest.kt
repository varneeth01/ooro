package com.ooro.screenplayer

import com.ooro.screenplayer.api.ManifestCodec
import com.ooro.screenplayer.model.CreativeType
import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.player.downloadVerifiedAsset
import com.ooro.screenplayer.player.sha256
import com.ooro.screenplayer.player.ScheduleEngine
import com.ooro.screenplayer.player.isVerifiedCachedAsset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.io.File
import java.net.InetAddress
import java.net.ServerSocket

class OfflinePlaybackRulesTest {
    private val now = Instant.parse("2026-11-05T10:00:00Z")
    private fun item(id: String, priority: Int = 0, intervalSeconds: Double = 0.0) = ManifestItem(
        id = id, campaignId = "campaign-$id", creativeId = "creative-$id", type = CreativeType.IMAGE,
        url = "https://assets.example/$id.png", checksum = "a".repeat(64), durationSeconds = 10,
        priority = priority, startAt = null, endAt = null, daysOfWeek = emptySet(),
        startTime = null, endTime = null, assetId = "asset-$id", fitMode = FitMode.FIT,
        intervalSeconds = intervalSeconds,
    )
    private fun manifest(items: List<ManifestItem>, validUntil: Instant? = now.plusSeconds(900)) =
        DeviceManifest(7, "screen-test", "UTC", items, validUntil)

    @Test fun freshVerifiedAssetRemainsSelectableWhenNetworkIsUnavailable() {
        val directory = kotlin.io.path.createTempDirectory("ooro-offline-playlist-").toFile()
        val target = File(directory, "asset-a")
        val temp = File(directory, "asset-a.part")
        val payload = "authorized fixture bytes".toByteArray()
        val server = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
        val serverThread = Thread {
            runCatching {
                server.accept().use { socket ->
                    val reader = socket.getInputStream().bufferedReader()
                    reader.readLine()
                    while (!reader.readLine().isNullOrEmpty()) { }
                    socket.getOutputStream().use { output ->
                        output.write("HTTP/1.1 200 OK\r\nContent-Length: ${payload.size}\r\nConnection: close\r\n\r\n".toByteArray())
                        output.write(payload)
                    }
                }
            }
        }.apply { isDaemon = true; start() }
        try {
            val downloaded = downloadVerifiedAsset("http://127.0.0.1:${server.localPort}/asset", temp, target, null)
            val creative = item("a").copy(checksum = sha256(downloaded))
            assertTrue(isVerifiedCachedAsset(downloaded, creative.checksum))
            server.close() // subsequent selection has no network dependency
            assertEquals("a", nextVerifiedManifestItem(manifest(listOf(creative)), ScheduleEngine(), now, 0, setOf("a"))?.id)
        } finally {
            runCatching { server.close() }
            serverThread.join(1_000)
            directory.deleteRecursively()
        }
    }

    @Test fun restartCanReconstructManifestAndLocalAssetEligibility() {
        val original = manifest(listOf(item("a")))
        val afterRestart = ManifestCodec.parse(ManifestCodec.encode(original))
        val newScheduler = ScheduleEngine()
        assertEquals("a", nextVerifiedManifestItem(afterRestart, newScheduler, now, 0, setOf("a"))?.id)
    }

    @Test fun refreshFailureDoesNotAuthorizeCommitOfAnUnverifiedCandidate() {
        assertFalse(canCommitDownloadedManifest(requiredCount = 2, verifiedCount = 1))
        assertTrue(canCommitDownloadedManifest(requiredCount = 2, verifiedCount = 2))
    }

    @Test fun halfDownloadedOrMissingAssetIsNotInVerifiedSelection() {
        assertNull(nextVerifiedManifestItem(manifest(listOf(item("a"))), ScheduleEngine(), now, 0, emptySet()))
    }

    @Test fun checksumMismatchAndCorruptedCacheAreExcluded() {
        val available = setOf("good")
        val candidates = manifest(listOf(item("bad"), item("good")))
        assertEquals("good", nextVerifiedManifestItem(candidates, ScheduleEngine(), now, 0, available)?.id)
    }

    @Test fun legitimateEmptyManifestCanReplacePreviousPlaylist() {
        assertTrue(canCommitDownloadedManifest(requiredCount = 0, verifiedCount = 0))
        assertNull(nextVerifiedManifestItem(manifest(emptyList()), ScheduleEngine(), now, 0, emptySet()))
    }

    @Test fun manifestExpiresAtExclusiveBoundaryWithoutOfflineGrace() {
        assertTrue(manifestIsAuthorizedAt(manifest(listOf(item("a")), now.plusNanos(1)), now))
        assertFalse(manifestIsAuthorizedAt(manifest(listOf(item("a")), now), now))
        assertFalse(manifestIsAuthorizedAt(manifest(listOf(item("a")), now.minusNanos(1)), now))
    }

    @Test fun sponsoredOfflineAssetRequiresV3LeaseScheduleImageAndVerifiedChecksum() {
        val sponsor = item("sponsor").copy(startAt = now.minusSeconds(5), endAt = now.plusSeconds(50))
        val v3 = manifest(emptyList()).copy(layout = DisplayLayout.FOUR_ZONE, layoutContractVersion = 3, sponsoredItem = sponsor)
        assertEquals("sponsor", eligibleSponsoredItem(v3, now, setOf("sponsor"))?.id)
        assertNull(eligibleSponsoredItem(v3, now, emptySet()))
        assertNull(eligibleSponsoredItem(v3.copy(validUntil = now), now, setOf("sponsor")))
        assertNull(eligibleSponsoredItem(v3, now.plusSeconds(50), setOf("sponsor")))
        assertNull(eligibleSponsoredItem(v3.copy(layoutContractVersion = 2), now, setOf("sponsor")))
        assertNull(eligibleSponsoredItem(v3.copy(sponsoredItem = sponsor.copy(type = CreativeType.VIDEO)), now, setOf("sponsor")))
    }

    @Test fun manifestRefreshIsScheduledTwoMinutesBeforeTheServerLeaseExpires() {
        assertEquals(13 * 60_000L, manifestRefreshDelayMillis(now.plusSeconds(15 * 60L), now))
        assertEquals(0L, manifestRefreshDelayMillis(now.plusSeconds(60), now))
        assertNull(manifestRefreshDelayMillis(now, now))
        assertNull(manifestRefreshDelayMillis(null, now))
    }

    @Test fun manifestReconnectBackoffIsBoundedAndExponential() {
        assertEquals(2_000L, syncRetryDelayMillis(1, 0))
        assertEquals(4_999L, syncRetryDelayMillis(2, 999))
        assertEquals(256_999L, syncRetryDelayMillis(8, 999))
        assertEquals(256_999L, syncRetryDelayMillis(20, 999))
    }

    @Test fun networkRecoveryRefreshIsThrottledForThirtySecondsUsingElapsedTime() {
        assertTrue(shouldRefreshAfterNetworkRecovery(1_000L, 0L))
        assertFalse(shouldRefreshAfterNetworkRecovery(30_999L, 1_000L))
        assertTrue(shouldRefreshAfterNetworkRecovery(31_000L, 1_000L))
    }

    @Test fun refreshedManifestCannotExtendPlaybackPastCampaignOrAllocationEnd() {
        val item = item("allocated-slot").copy(startAt = now.minusSeconds(60), endAt = now.plusSeconds(600))
        val refreshed = manifest(listOf(item), now.plusSeconds(900))
        assertTrue(manifestIsAuthorizedAt(refreshed, now.plusSeconds(599)))
        assertEquals(item.id, nextVerifiedManifestItem(refreshed, ScheduleEngine(), now.plusSeconds(599), 0, setOf(item.id))?.id)
        assertNull(nextVerifiedManifestItem(refreshed, ScheduleEngine(), now.plusSeconds(600), 0, setOf(item.id)))
    }

    @Test fun missingExpiryDoesNotCreateAnOfflineGracePeriod() {
        assertFalse(manifestIsAuthorizedAt(manifest(listOf(item("a")), null), now))
        assertNull(nextVerifiedManifestItem(manifest(listOf(item("a")), null), ScheduleEngine(), now, 0, setOf("a")))
    }

    @Test fun playlistTransitionsOnlyAcrossVerifiedScheduledItems() {
        val list = manifest(listOf(item("a"), item("b"), item("c")))
        val scheduler = ScheduleEngine()
        val verified = setOf("a", "c")
        assertEquals("a", nextVerifiedManifestItem(list, scheduler, now, 0, verified)?.id)
        assertEquals("c", nextVerifiedManifestItem(list, scheduler, now, 1, verified)?.id)
        assertEquals("a", nextVerifiedManifestItem(list, scheduler, now, 2, verified)?.id)
    }

    @Test fun pacedItemsRemainSubjectToTheirScheduleBucket() {
        val paced = item("paced", priority = 1, intervalSeconds = 600.0)
        val scheduler = ScheduleEngine()
        assertEquals("paced", nextVerifiedManifestItem(manifest(listOf(paced)), scheduler, now, 0, setOf("paced"))?.id)
        scheduler.recordStarted(paced, now)
        assertNull(nextVerifiedManifestItem(manifest(listOf(paced)), scheduler, now.plusSeconds(20), 0, setOf("paced")))
    }

    @Test fun unavailableEmergencyCreativeDoesNotFallThroughToLowerPriorityAd() {
        val low = item("low", priority = 10)
        val emergency = item("emergency", priority = 1000)
        assertNull(nextVerifiedManifestItem(manifest(listOf(low, emergency)), ScheduleEngine(), now, 0, setOf("low")))
    }

    @Test fun cleanupKeepsNewPlaylistAndCurrentlyPlayingAsset() {
        assertEquals(setOf("new", "old-playing"), retainedAssetIds(setOf("new"), "old-playing"))
        assertEquals(setOf("new"), retainedAssetIds(setOf("new"), null))
    }

    @Test fun storagePressureCannotCommitManifestWithMissingAsset() {
        assertFalse(canCommitDownloadedManifest(requiredCount = 3, verifiedCount = 2))
        assertNull(nextVerifiedManifestItem(manifest(listOf(item("a"))), ScheduleEngine(), now, 0, emptySet()))
    }

    @Test fun noPreviouslyCachedCreativeShowsEmptyContentState() {
        assertNull(nextVerifiedManifestItem(manifest(emptyList()), ScheduleEngine(), now, 0, emptySet()))
        assertNull(nextVerifiedManifestItem(manifest(listOf(item("not-cached"))), ScheduleEngine(), now, 0, emptySet()))
    }

    @Test fun cachedStartupSelectsVerifiedAuthorizedCreativeForThePairedScreenWithoutNetwork() {
        val playlist = manifest(listOf(item("cached")))
        val resolution = resolveCachedStartup(playlist, "screen-test", setOf("cached"), ScheduleEngine(), now)
        assertEquals(CachedStartupBlock.NONE, resolution.block)
        assertEquals("cached", resolution.firstItem?.id)
        assertEquals(playlist, resolution.manifest)
    }

    @Test fun cachedStartupFailsClosedForExpiredOrWrongScreenManifest() {
        val playlist = manifest(listOf(item("cached")))
        val expired = resolveCachedStartup(playlist.copy(validUntil = now), "screen-test", setOf("cached"), ScheduleEngine(), now)
        assertEquals(CachedStartupBlock.AUTHORIZATION_EXPIRED, expired.block)
        assertNull(expired.firstItem)
        val wrongScreen = resolveCachedStartup(playlist, "different-screen", setOf("cached"), ScheduleEngine(), now)
        assertEquals(CachedStartupBlock.SCREEN_ID_MISMATCH, wrongScreen.block)
        assertNull(wrongScreen.manifest)
        assertNull(wrongScreen.firstItem)
    }

    @Test fun cachedStartupDistinguishesUnpairedAndNoManifestStates() {
        assertEquals(CachedStartupBlock.NO_MANIFEST, resolveCachedStartup(null, "screen-test", emptySet(), ScheduleEngine(), now).block)
        assertEquals(CachedStartupBlock.UNPAIRED, resolveCachedStartup(manifest(listOf(item("cached"))), null, setOf("cached"), ScheduleEngine(), now).block)
    }

    @Test fun cachedStartupSkipsMissingOrCorruptAssetsAndDoesNotCreateProofs() {
        val playlist = manifest(listOf(item("missing"), item("corrupt")))
        val resolution = resolveCachedStartup(playlist, "screen-test", emptySet(), ScheduleEngine(), now)
        assertEquals(CachedStartupBlock.NO_ELIGIBLE_VERIFIED_ASSET, resolution.block)
        assertNull(resolution.firstItem)
        // This resolver is selection-only; proof creation belongs to observed playback completion.
        assertTrue(acknowledgedProofEventIds(emptySet(), emptySet()).isEmpty())
    }

    @Test fun proofAcknowledgementDeletesOnlyStableSelectedIds() {
        val selected = setOf("event-a", "event-b")
        assertEquals(setOf("event-a"), acknowledgedProofEventIds(selected, setOf("event-a", "unselected-event")))
        assertTrue(acknowledgedProofEventIds(selected, emptySet()).isEmpty())
    }

    @Test fun offlineProofRowsRemainEligibleForRetryUntilAcknowledged() {
        assertTrue(com.ooro.screenplayer.sync.shouldRetryProofBatch(selectedCount = 2, acknowledgedCount = 0))
        assertTrue(com.ooro.screenplayer.sync.shouldRetryProofBatch(selectedCount = 2, acknowledgedCount = 1))
        assertFalse(com.ooro.screenplayer.sync.shouldRetryProofBatch(selectedCount = 2, acknowledgedCount = 2))
    }

    @Test fun duplicateProofEventIdsRemainStableAcrossReconciliationRetries() {
        val eventId = "stable-event-123"
        assertEquals(setOf(eventId), acknowledgedProofEventIds(setOf(eventId), setOf(eventId)))
        assertEquals(setOf(eventId), acknowledgedProofEventIds(setOf(eventId), setOf(eventId)))
    }
}
