package com.ooro.screenplayer

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.TestListenableWorkerBuilder
import com.ooro.screenplayer.api.*
import com.ooro.screenplayer.data.*
import com.ooro.screenplayer.model.*
import com.ooro.screenplayer.player.AssetManager
import com.ooro.screenplayer.player.ScheduleEngine
import com.ooro.screenplayer.repository.ProofOfPlayRepository
import com.ooro.screenplayer.sync.SyncWorker
import com.ooro.screenplayer.sync.SyncWorkerDependencies
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File
import java.net.ServerSocket
import java.security.MessageDigest
import java.time.Instant
import kotlin.concurrent.thread

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [29])
class OfflinePersistenceIntegrationTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val name = "offline-${System.nanoTime()}.db"
    private var db: OoroDatabase? = null
    private val credentials = DeviceCredentials("device-test", "screen-test", "workspace-test", "fake", "Test")
    private fun open() = Room.databaseBuilder(context, OoroDatabase::class.java, name).allowMainThreadQueries().build().also { db = it }
    @After fun clean() { SyncWorkerDependencies.reset(); db?.close(); context.deleteDatabase(name) }

    @Test fun verifiedManifestAssetAndOfflineProofSurviveDatabaseCloseAndReopen() = runBlocking {
        val first = open()
        val bytes = "synthetic-approved-creative".toByteArray()
        val checksum = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        val itemId = "creative-offline-${System.nanoTime()}"
        val server = ServerSocket(0)
        val serving = thread {
            server.accept().use { socket ->
                val request = socket.getInputStream().bufferedReader()
                while (!request.readLine().isNullOrEmpty()) { }
                socket.getOutputStream().write("HTTP/1.1 200 OK\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n\r\n".toByteArray())
                socket.getOutputStream().write(bytes)
                socket.getOutputStream().flush()
            }
            server.close()
        }
        val item = ManifestItem(itemId, "campaign-approved", "creative-approved", CreativeType.IMAGE, "http://127.0.0.1:${server.localPort}/creative", checksum, 10, 1, null, null, emptySet(), null, null)
        val downloaded = AssetManager(context).ensure(item)
        serving.join()
        assertNotNull("production AssetManager should persist the downloaded asset", downloaded)
        assertTrue(com.ooro.screenplayer.player.isVerifiedCachedAsset(downloaded!!, checksum))
        val manifest = DeviceManifest(8, credentials.screenId, "UTC", listOf(item), Instant.parse("2030-01-01T00:00:00Z"))
        val entity = ManifestEntity(version = 8, timezone = "UTC", validUntil = manifest.validUntil.toString(), json = ManifestCodec.encode(manifest))
        first.manifestDao().put(entity)
        assertEquals("Downloading and selecting media must not fabricate proof", 0, first.proofDao().pendingCount())
        val proof = ProofOfPlay(eventId = "event-1", screenId = credentials.screenId, deviceId = credentials.deviceId, campaignId = "campaign", creativeId = "creative", scheduleItemId = "item", startedAt = Instant.parse("2026-01-01T00:00:00Z"), endedAt = Instant.parse("2026-01-01T00:00:10Z"), actualPlayedMs = 10_000, appVersion = "test")
        ProofOfPlayRepository(first).record(proof)
        ProofOfPlayRepository(first).record(proof) // Stable event ID makes recording idempotent.
        first.close(); db = null
        val reopened = open()
        assertEquals(entity, reopened.manifestDao().active())
        assertEquals("event-1", reopened.proofDao().pending(10).single().eventId)
        val restored = ManifestCodec.parse(reopened.manifestDao().active()!!.json)
        val now = Instant.parse("2026-01-01T00:00:00Z")
        val proofsBeforeSelection = reopened.proofDao().pendingCount()
        assertTrue(manifestIsAuthorizedAt(restored, now))
        val restoredAssets = AssetManager(context).verifiedItemIds(restored.items)
        assertEquals(setOf(item.id), restoredAssets)
        val startup = resolveCachedStartup(restored, credentials.screenId, restoredAssets, ScheduleEngine(), now)
        assertEquals(CachedStartupBlock.NONE, startup.block)
        assertEquals(item.id, startup.firstItem?.id)
        assertEquals("cached selection must not create another proof", proofsBeforeSelection, reopened.proofDao().pendingCount())
        File(context.filesDir, "creative-cache/${item.id}").delete()
        File(context.filesDir, "creative-cache/.$itemId.sha256").delete()
        Unit
    }

    @Test fun missingAndCorruptCachedFilesAreNotEligibleAfterOfflineRestart() = runBlocking {
        val directory = File(context.filesDir, "creative-cache").also { it.mkdirs() }
        val assetManager = AssetManager(context)
        val now = Instant.parse("2026-11-05T10:00:00Z")
        val missing = ManifestItem("offline-missing-${System.nanoTime()}", "c", "missing", CreativeType.IMAGE, "https://invalid.test/missing", "a".repeat(64), 10, 0, null, null, emptySet(), null, null)
        val corrupt = ManifestItem("offline-corrupt-${System.nanoTime()}", "c", "corrupt", CreativeType.IMAGE, "https://invalid.test/corrupt", "a".repeat(64), 10, 0, null, null, emptySet(), null, null)
        val corruptFile = File(directory, corrupt.id).apply { writeText("corrupt-content") }
        val items = listOf(missing, corrupt)
        val manifest = DeviceManifest(5, credentials.screenId, "UTC", items, now.plusSeconds(600))
        val database = open()
        database.manifestDao().put(ManifestEntity(version = 5, timezone = "UTC", validUntil = manifest.validUntil.toString(), json = ManifestCodec.encode(manifest)))
        database.close(); db = null

        val reopened = open()
        val restored = ManifestCodec.parse(reopened.manifestDao().active()!!.json)
        val verified = assetManager.verifiedItemIds(restored.items)
        assertTrue("missing and checksum-corrupt files must not be marked verified", verified.isEmpty())
        val resolution = resolveCachedStartup(restored, credentials.screenId, verified, ScheduleEngine(), now)
        assertEquals(CachedStartupBlock.NO_ELIGIBLE_VERIFIED_ASSET, resolution.block)
        assertNull(resolution.firstItem)
        assertEquals(0, reopened.proofDao().pendingCount())
        corruptFile.delete()
        File(directory, ".${corrupt.id}.sha256").delete()
        File(directory, missing.id).delete()
        File(directory, ".${missing.id}.sha256").delete()
        Unit
    }

    @Test fun cachedStartupRejectsAnotherDisplayAndExpiredAuthorizationAfterDatabaseReopen() = runBlocking {
        val database = open()
        val now = Instant.parse("2026-11-05T10:00:00Z")
        val item = ManifestItem("identity-item", "campaign", "creative", CreativeType.IMAGE, "https://invalid.test/media", "a".repeat(64), 10, 0, null, null, emptySet(), null, null)
        val cached = DeviceManifest(2, credentials.screenId, "UTC", listOf(item), now.plusSeconds(600))
        database.manifestDao().put(ManifestEntity(version = cached.version, timezone = cached.timezone, validUntil = cached.validUntil.toString(), json = ManifestCodec.encode(cached)))
        database.close(); db = null

        val reopened = open()
        val restored = ManifestCodec.parse(reopened.manifestDao().active()!!.json)
        assertEquals(CachedStartupBlock.SCREEN_ID_MISMATCH, resolveCachedStartup(restored, "other-screen", setOf(item.id), ScheduleEngine(), now).block)
        assertEquals(CachedStartupBlock.AUTHORIZATION_EXPIRED, resolveCachedStartup(restored.copy(validUntil = now), credentials.screenId, setOf(item.id), ScheduleEngine(), now).block)
        assertEquals(0, reopened.proofDao().pendingCount())
    }

    @Test fun expiredManifestCannotSelectCachedItemAfterRoomReopen() = runBlocking {
        val item = ManifestItem("i", "c", "cr", CreativeType.IMAGE, "file://cached", "a".repeat(64), 10, 1, null, null, emptySet(), null, null)
        val expired = DeviceManifest(1, "screen", "UTC", listOf(item), Instant.parse("2020-01-01T00:00:00Z"))
        val database = open()
        database.manifestDao().put(ManifestEntity(version = 1, timezone = "UTC", validUntil = expired.validUntil.toString(), json = ManifestCodec.encode(expired)))
        database.close(); db = null
        val reopened = open()
        val persisted = ManifestCodec.parse(reopened.manifestDao().active()!!.json)
        assertNull(nextVerifiedManifestItem(persisted, ScheduleEngine(), Instant.parse("2026-01-01T00:00:00Z"), 0, setOf("i")))
        assertFalse(canCommitManifestResponse(persisted, requiredCount = 1, verifiedCount = 1, now = Instant.parse("2026-01-01T00:00:00Z")))
    }

    @Test fun legitimateEmptyManifestReplacesPreviouslyPlayableManifest() = runBlocking {
        val database = open()
        val item = ManifestItem("old", "campaign", "creative", CreativeType.IMAGE, "file://old", "a".repeat(64), 10, 1, null, null, emptySet(), null, null)
        val active = DeviceManifest(1, credentials.screenId, "UTC", listOf(item), Instant.parse("2030-01-01T00:00:00Z"))
        database.manifestDao().put(ManifestEntity(version = 1, timezone = "UTC", validUntil = active.validUntil.toString(), json = ManifestCodec.encode(active)))
        val revoked = DeviceManifest(2, credentials.screenId, "UTC", emptyList(), Instant.parse("2030-01-01T00:00:00Z"))
        val api = FakeApi().apply { manifestResponse = revoked }
        val response = api.manifest(credentials)
        assertTrue(canCommitManifestResponse(response, requiredCount = 0, verifiedCount = 0, now = Instant.parse("2026-01-01T00:00:00Z")))
        database.manifestDao().put(ManifestEntity(version = response.version, timezone = "UTC", validUntil = response.validUntil.toString(), json = ManifestCodec.encode(response)))
        database.close(); db = null
        val reopened = open()
        val persisted = ManifestCodec.parse(reopened.manifestDao().active()!!.json)
        assertEquals(2L, persisted.version)
        assertTrue(persisted.items.isEmpty())
        assertNull(nextVerifiedManifestItem(persisted, ScheduleEngine(), Instant.parse("2026-01-01T00:00:00Z"), 0, emptySet()))
    }

    private class FakeApi(var acknowledgements: Set<String> = emptySet(), var failUpload: Boolean = false) : DeviceApi {
        val submittedIds = mutableListOf<List<String>>()
        var manifestResponse: DeviceManifest? = null
        var manifestFailure: Throwable? = null
        override suspend fun health() = Unit
        override suspend fun pair(request: PairRequest) = error("unused")
        override suspend fun manifest(credentials: DeviceCredentials): DeviceManifest {
            manifestFailure?.let { throw it }
            return manifestResponse ?: error("no fake manifest configured")
        }
        override suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long, telemetry: HeartbeatTelemetry) = Unit
        override suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>): ProofUploadResult { submittedIds += events.map { it.eventId }; if (failUpload) error("offline"); return ProofUploadResult(acknowledgements.size, acknowledgements) }
        override suspend fun unpair(credentials: DeviceCredentials) = Unit
    }

    @Test fun failedManifestRefreshLeavesLastValidManifestUsableUntilItsLeaseExpires() = runBlocking {
        val database = open()
        val now = Instant.parse("2026-11-05T10:00:00Z")
        val item = ManifestItem("still-authorized", "campaign", "creative", CreativeType.IMAGE, "https://asset.invalid/media", "a".repeat(64), 10, 1, now.minusSeconds(60), now.plusSeconds(600), emptySet(), null, null)
        val cached = DeviceManifest(1, credentials.screenId, "UTC", listOf(item), now.plusSeconds(900))
        val cachedEntity = ManifestEntity(version = 1, timezone = "UTC", validUntil = cached.validUntil.toString(), json = ManifestCodec.encode(cached))
        database.manifestDao().put(cachedEntity)

        val api = FakeApi().apply { manifestFailure = java.net.SocketTimeoutException("fixture timeout") }
        assertTrue(runCatching { api.manifest(credentials) }.isFailure)
        assertEquals(cachedEntity, database.manifestDao().active())
        val reopened = run { database.close(); db = null; open() }
        val lastKnownGood = ManifestCodec.parse(reopened.manifestDao().active()!!.json)
        assertEquals(item.id, nextVerifiedManifestItem(lastKnownGood, ScheduleEngine(), now.plusSeconds(300), 0, setOf(item.id))?.id)
        assertNull(nextVerifiedManifestItem(lastKnownGood, ScheduleEngine(), now.plusSeconds(900), 0, setOf(item.id)))
    }

    @Test fun successfulRefreshExtendsManifestLeaseButItemScheduleStillCapsPlayback() = runBlocking {
        val database = open()
        val now = Instant.parse("2026-11-05T10:00:00Z")
        val item = ManifestItem("campaign-end-bound", "campaign", "creative", CreativeType.IMAGE, "https://asset.invalid/media", "a".repeat(64), 10, 1, now.minusSeconds(60), now.plusSeconds(600), emptySet(), null, null)
        val previous = DeviceManifest(1, credentials.screenId, "UTC", listOf(item), now.plusSeconds(120))
        database.manifestDao().put(ManifestEntity(version = 1, timezone = "UTC", validUntil = previous.validUntil.toString(), json = ManifestCodec.encode(previous)))
        val refreshed = DeviceManifest(2, credentials.screenId, "UTC", listOf(item), now.plusSeconds(900))
        val api = FakeApi().apply { manifestResponse = refreshed }
        val response = api.manifest(credentials)
        assertTrue(canCommitManifestResponse(response, requiredCount = 1, verifiedCount = 1, now = now))
        database.manifestDao().put(ManifestEntity(version = response.version, timezone = response.timezone, validUntil = response.validUntil.toString(), json = ManifestCodec.encode(response)))
        val committed = ManifestCodec.parse(database.manifestDao().active()!!.json)
        assertTrue(manifestIsAuthorizedAt(committed, now.plusSeconds(899)))
        assertNull(nextVerifiedManifestItem(committed, ScheduleEngine(), now.plusSeconds(600), 0, setOf(item.id)))
    }

    @Test fun productionWorkerKeepsPartialAcknowledgementsForRetryAndDeduplicatesIds() = runBlocking {
        val database = open()
        database.proofDao().add(ProofEntity("accepted", "{\"screenId\":\"${credentials.screenId}\",\"deviceId\":\"${credentials.deviceId}\",\"campaignId\":\"c\",\"creativeId\":\"a\",\"scheduleItemId\":\"i\",\"startedAt\":\"2026-01-01T00:00:00Z\",\"endedAt\":\"2026-01-01T00:00:10Z\",\"success\":true,\"appVersion\":\"test\"}"))
        database.proofDao().add(ProofEntity("retry", "{\"screenId\":\"${credentials.screenId}\",\"deviceId\":\"${credentials.deviceId}\",\"campaignId\":\"c\",\"creativeId\":\"b\",\"scheduleItemId\":\"i\",\"startedAt\":\"2026-01-01T00:00:00Z\",\"endedAt\":\"2026-01-01T00:00:10Z\",\"success\":true,\"appVersion\":\"test\"}"))
        val api = FakeApi(setOf("accepted"))
        SyncWorkerDependencies.credentials = { credentials }
        SyncWorkerDependencies.database = { database }
        SyncWorkerDependencies.api = { _, _ -> api }
        val firstResult = TestListenableWorkerBuilder<SyncWorker>(context).build().doWork()
        assertEquals(androidx.work.ListenableWorker.Result.retry(), firstResult)
        assertEquals(listOf("retry"), database.proofDao().pending(10).map { it.eventId })
        database.close(); db = null
        val reopened = open()
        assertEquals(listOf("retry"), reopened.proofDao().pending(10).map { it.eventId })
        api.acknowledgements = setOf("retry")
        SyncWorkerDependencies.database = { reopened }
        assertEquals(androidx.work.ListenableWorker.Result.success(), TestListenableWorkerBuilder<SyncWorker>(context).build().doWork())
        assertEquals(0, reopened.proofDao().pendingCount())
    }

    @Test fun failedUploadSurvivesWorkerRecreationAndRetriesWithSameEventId() = runBlocking {
        val database = open()
        database.proofDao().add(ProofEntity("stable-retry-id", "{\"screenId\":\"${credentials.screenId}\",\"deviceId\":\"${credentials.deviceId}\",\"campaignId\":\"c\",\"creativeId\":\"a\",\"scheduleItemId\":\"i\",\"startedAt\":\"2026-01-01T00:00:00Z\",\"endedAt\":\"2026-01-01T00:00:10Z\",\"success\":true,\"appVersion\":\"test\"}"))
        val api = FakeApi(failUpload = true)
        SyncWorkerDependencies.credentials = { credentials }
        SyncWorkerDependencies.database = { database }
        SyncWorkerDependencies.api = { _, _ -> api }
        assertEquals(androidx.work.ListenableWorker.Result.retry(), TestListenableWorkerBuilder<SyncWorker>(context).build().doWork())
        assertEquals(1, database.proofDao().pendingCount())
        database.close(); db = null

        val reopened = open()
        api.failUpload = false
        api.acknowledgements = setOf("stable-retry-id")
        SyncWorkerDependencies.database = { reopened }
        assertEquals(androidx.work.ListenableWorker.Result.success(), TestListenableWorkerBuilder<SyncWorker>(context).build().doWork())
        assertEquals(listOf(listOf("stable-retry-id"), listOf("stable-retry-id")), api.submittedIds)
        assertEquals(0, reopened.proofDao().pendingCount())
    }
}
