package com.ooro.screenplayer.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ooro.screenplayer.api.ApiProvider
import com.ooro.screenplayer.BuildConfig
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.PlayerStatus
import com.ooro.screenplayer.data.OoroDatabase
import com.ooro.screenplayer.model.ProofOfPlay
import org.json.JSONObject
import java.time.Instant
import android.util.Log
import com.ooro.screenplayer.location.LocationReporter
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

object ProofSyncScheduler {
    private const val WORK_NAME = "ooro-proof-sync-v4"
    private val LEGACY_WORK_NAMES = arrayOf("ooro-proof-sync", "ooro-proof-sync-v2", "ooro-proof-sync-v3")

    fun enqueue(context: Context, reason: String) {
        // Do not gate the proof queue on Android's validated-network capability.
        // A local API reached through ADB reverse is intentionally not validated,
        // and hosted outages must be handled by the worker's retry/backoff path.
        // The periodic heartbeat remains network-constrained in OoroApplication.
        val request = OneTimeWorkRequestBuilder<SyncWorker>().build()
        WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, request)
        Log.i("OoroScreen", "proof sync enqueued reason=$reason work=$WORK_NAME")
    }

    fun cancelLegacy(context: Context) {
        val work = WorkManager.getInstance(context)
        LEGACY_WORK_NAMES.forEach(work::cancelUniqueWork)
        work.cancelUniqueWork("ooro-startup-sync")
        work.cancelUniqueWork("ooro-connectivity-recovery")
        work.cancelUniqueWork("ooro-diagnostic-retry")
    }
}

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = workerMutex.withLock { doWorkLocked() }

    private suspend fun doWorkLocked(): Result {
        val attempt = runAttemptCount
        Log.i("OoroScreen", "proof worker started attempt=$attempt")
        val store = DeviceStore(applicationContext)
        val credentials = store.credentials() ?: run {
            Log.w("OoroScreen", "proof worker skipped credentials unavailable attempt=$attempt")
            return Result.success()
        }
        val db = OoroDatabase.get(applicationContext)
        return try {
            val api = ApiProvider(store).api
            Log.i("OoroScreen", "proof worker heartbeat sending attempt=$attempt")
            api.heartbeat(credentials, PlayerStatus.READY, db.manifestDao().active()?.version ?: 0, com.ooro.screenplayer.model.HeartbeatTelemetry(LocationReporter(applicationContext).latest()))
            Log.i("OoroScreen", "proof worker heartbeat accepted attempt=$attempt")
            CommandProcessor(applicationContext, api, store).poll()
            val pendingCount = db.proofDao().pendingCount()
            Log.i("OoroScreen", "proof worker pending count=$pendingCount attempt=$attempt")
            if (pendingCount == 0) {
                Log.i("OoroScreen", "proof worker completed no pending proofs attempt=$attempt")
                return Result.success()
            }
            val rows = db.proofDao().pending(50)
            val staleRows = rows.filter { row ->
                val payload = JSONObject(row.payload)
                payload.optString("screenId") != credentials.screenId || payload.optString("deviceId") != credentials.deviceId
            }
            if (staleRows.isNotEmpty()) {
                db.proofDao().delete(staleRows.map { it.eventId })
                Log.w("OoroScreen", "proof worker quarantined stale rows=${staleRows.size} expectedScreen=${credentials.screenId} expectedDevice=${credentials.deviceId}")
            }
            val uploadRows = rows.filterNot { staleRows.any { stale -> stale.eventId == it.eventId } }
            if (uploadRows.isEmpty()) {
                Log.i("OoroScreen", "proof worker batch contained only stale rows; continuing")
                return doWorkLocked()
            }
            Log.i("OoroScreen", "proof worker selected rows=${uploadRows.size} stale=${staleRows.size} attempt=$attempt")
            val events = uploadRows.map { row ->
                val j = JSONObject(row.payload)
                ProofOfPlay(eventId = row.eventId, screenId = j.getString("screenId"), deviceId = j.getString("deviceId"), campaignId = j.getString("campaignId"), creativeId = j.getString("creativeId"), scheduleItemId = j.getString("scheduleItemId"), startedAt = Instant.parse(j.getString("startedAt")), endedAt = Instant.parse(j.getString("endedAt")), expectedDurationMs = j.optLong("expectedDurationMs"), actualPlayedMs = j.optLong("actualPlayedMs"), success = j.getBoolean("success"), failureReason = j.optString("failureReason").takeIf { it.isNotBlank() }, appVersion = j.getString("appVersion"), assetId = j.optString("assetId").takeIf { it.isNotBlank() })
            }
            Log.i("OoroScreen", "proof upload starting batch=${events.size} attempt=$attempt")
            val upload = api.uploadProof(credentials, events)
            Log.i("OoroScreen", "proof upload acknowledged accepted=${upload.accepted} batch=${events.size} attempt=$attempt")
            val selectedIds = uploadRows.map { it.eventId }.toSet()
            val acknowledgedIds = upload.acceptedEventIds.intersect(selectedIds)
            if (acknowledgedIds.isEmpty() && upload.accepted > 0) {
                Log.w("OoroScreen", "proof upload acknowledgment missing event IDs accepted=${upload.accepted} selected=${events.size}; retaining local rows")
            }
            if (acknowledgedIds.isNotEmpty()) {
                db.proofDao().delete(acknowledgedIds.toList())
            }
            Log.i("OoroScreen", "proof local acknowledgment deleted=${acknowledgedIds.size} remaining=${db.proofDao().pendingCount()} attempt=$attempt")
            if (acknowledgedIds.size < events.size) {
                Log.w("OoroScreen", "proof upload partial acknowledgment accepted=${upload.accepted} acknowledged=${acknowledgedIds.size} selected=${events.size}; retaining unacknowledged rows")
                return Result.retry()
            }
            Log.i("OoroScreen", "proof worker completed attempt=$attempt")
            Result.success()
        } catch (error: Throwable) {
            val authFailure = error as? com.ooro.screenplayer.api.DeviceApiException
            if (authFailure?.kind in setOf(
                    com.ooro.screenplayer.api.DeviceFailureKind.AUTH_EXPIRED,
                    com.ooro.screenplayer.api.DeviceFailureKind.AUTH_INVALID,
                    com.ooro.screenplayer.api.DeviceFailureKind.AUTH_REVOKED,
                    com.ooro.screenplayer.api.DeviceFailureKind.DEVICE_NOT_FOUND,
                    com.ooro.screenplayer.api.DeviceFailureKind.PAIRING_REQUIRED
                )) {
                Log.w("OoroScreen", "proof worker stopped authenticationRequired=true kind=${authFailure?.kind} attempt=$attempt")
                Result.failure()
            } else {
                Log.w("OoroScreen", "proof worker failed attempt=$attempt retry=true reason=${error::class.java.simpleName}", error)
                Result.retry()
            }
        }
    }

    companion object { private val workerMutex = Mutex() }
}
