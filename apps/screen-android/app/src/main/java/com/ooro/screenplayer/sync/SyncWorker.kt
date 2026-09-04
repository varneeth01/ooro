package com.ooro.screenplayer.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ooro.screenplayer.api.ApiProvider
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.PlayerStatus
import com.ooro.screenplayer.data.OoroDatabase
import com.ooro.screenplayer.model.ProofOfPlay
import org.json.JSONObject
import java.time.Instant

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result { val store = DeviceStore(applicationContext); val credentials = store.credentials() ?: return Result.success(); val db = OoroDatabase.get(applicationContext); return runCatching { val api = ApiProvider(store).api; api.heartbeat(credentials, PlayerStatus.READY, db.manifestDao().active()?.version ?: 0); CommandProcessor(applicationContext, api, store).poll(); val rows = db.proofDao().pending(50); if (rows.isNotEmpty()) { val events = rows.map { val j = JSONObject(it.payload); ProofOfPlay(it.eventId,j.getString("screenId"),j.getString("deviceId"),j.getString("campaignId"),j.getString("creativeId"),j.getString("scheduleItemId"),Instant.parse(j.getString("startedAt")),Instant.parse(j.getString("endedAt")),j.optLong("expectedDurationMs"),j.optLong("actualPlayedMs"),j.getBoolean("success"),j.optString("failureReason").takeIf { it.isNotBlank() },j.getString("appVersion")) }; api.uploadProof(credentials, events); db.proofDao().delete(rows.map { it.eventId }) }; Result.success() }.getOrElse { Result.retry() } }
}
