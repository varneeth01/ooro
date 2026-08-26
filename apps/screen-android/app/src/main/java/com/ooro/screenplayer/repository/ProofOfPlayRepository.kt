package com.ooro.screenplayer.repository

import com.ooro.screenplayer.data.*
import com.ooro.screenplayer.model.ProofOfPlay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class ProofOfPlayRepository(private val db: OoroDatabase) {
    suspend fun record(event: ProofOfPlay) = withContext(Dispatchers.IO) { db.proofDao().add(ProofEntity(event.eventId, JSONObject().put("eventId", event.eventId).put("screenId", event.screenId).put("deviceId", event.deviceId).put("campaignId", event.campaignId).put("creativeId", event.creativeId).put("scheduleItemId", event.scheduleItemId).put("startedAt", event.startedAt.toString()).put("endedAt", event.endedAt.toString()).put("success", event.success).put("appVersion", event.appVersion).toString())) }
    suspend fun pending(limit: Int = 50) = db.proofDao().pending(limit)
}
