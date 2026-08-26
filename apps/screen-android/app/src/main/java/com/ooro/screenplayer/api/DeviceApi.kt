package com.ooro.screenplayer.api

import android.os.Build
import com.ooro.screenplayer.BuildConfig
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.DayOfWeek
import java.time.LocalTime

interface DeviceApi { suspend fun pair(request: PairRequest): PairResponse; suspend fun manifest(credentials: DeviceCredentials): DeviceManifest; suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long); suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>); suspend fun unpair(credentials: DeviceCredentials) }

class MockDeviceApi : DeviceApi {
    override suspend fun pair(request: PairRequest) = PairResponse(DeviceCredentials(request.deviceId, "demo-screen", "demo-workspace", "demo-token-${request.deviceId}", "Demo Screen"))
    override suspend fun manifest(credentials: DeviceCredentials) = DeviceManifest(1, credentials.screenId, BuildConfig.DEFAULT_TIMEZONE, listOf(ManifestItem("demo-image", "demo-campaign", "demo-creative", CreativeType.IMAGE, "", null, 8, 1, null, null, emptySet(), null, null)), null)
    override suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long) = Unit
    override suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>) = Unit
    override suspend fun unpair(credentials: DeviceCredentials) = Unit
}

class HttpDeviceApi(private val baseUrl: String) : DeviceApi {
    private suspend fun request(path: String, method: String, token: String?, body: String? = null): String = withContext(Dispatchers.IO) {
        val connection = (URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 10_000; readTimeout = 15_000; setRequestProperty("Accept", "application/json"); token?.let { setRequestProperty("Authorization", "Bearer $it") }; if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json"); outputStream.use { it.write(body.toByteArray()) } } }
        if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}")
        connection.inputStream.bufferedReader().use { it.readText() }
    }
    override suspend fun pair(request: PairRequest): PairResponse { val json = request.toJson(); val body = request("/api/device/pair", "POST", null, json); val envelope = JSONObject(body); val obj = envelope.optJSONObject("data") ?: envelope; return PairResponse(DeviceCredentials(request.deviceId, obj.getString("screenId"), obj.optString("workspaceId"), obj.getString("deviceToken"), obj.optString("deviceName", "OORO Screen"))) }
    override suspend fun manifest(credentials: DeviceCredentials): DeviceManifest { val envelope = JSONObject(request("/api/device/manifest", "GET", credentials.token)); return ManifestCodec.parse((envelope.optJSONObject("data") ?: envelope).toString()) }
    override suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long) { request("/api/device/heartbeat", "POST", credentials.token, JSONObject().put("screenId", credentials.screenId).put("deviceId", credentials.deviceId).put("status", status.name).put("manifestVersion", manifestVersion).put("appVersion", BuildConfig.VERSION_NAME).toString()) }
    override suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>) { request("/api/device/proof-of-play", "POST", credentials.token, JSONObject().put("events", events.map { JSONObject().put("eventId", it.eventId).put("screenId", it.screenId).put("deviceId", it.deviceId).put("campaignId", it.campaignId).put("creativeId", it.creativeId).put("scheduleItemId", it.scheduleItemId).put("startedAt", it.startedAt.toString()).put("endedAt", it.endedAt.toString()).put("success", it.success).put("appVersion", it.appVersion) }).toString()) }
    override suspend fun unpair(credentials: DeviceCredentials) { request("/api/device/unpair", "POST", credentials.token) }
    private fun PairRequest.toJson() = JSONObject().put("pairingCode", pairingCode).put("deviceId", deviceId).put("manufacturer", manufacturer).put("model", model).put("androidVersion", androidVersion).put("appVersion", BuildConfig.VERSION_NAME).toString()
}

object ManifestCodec {
    fun parse(body: String): DeviceManifest {
        val root = JSONObject(body)
        val items = buildList {
            val values = root.optJSONArray("items") ?: org.json.JSONArray()
            for (index in 0 until values.length()) {
                val item = values.getJSONObject(index)
                val days = buildSet { item.optJSONArray("daysOfWeek")?.let { array -> for (day in 0 until array.length()) add(DayOfWeek.of(array.getInt(day))) } }
                add(ManifestItem(item.getString("id"), item.optString("campaignId"), item.optString("creativeId"), if (item.optString("type").lowercase() == "video") CreativeType.VIDEO else CreativeType.IMAGE, item.getString("url"), item.optString("checksum").takeIf { it.isNotBlank() }, item.optInt("durationSeconds", 10), item.optInt("priority", 0), item.optString("startAt").takeIf { it.isNotBlank() }?.let(Instant::parse), item.optString("endAt").takeIf { it.isNotBlank() }?.let(Instant::parse), days, item.optString("startTime").takeIf { it.isNotBlank() }?.let(LocalTime::parse), item.optString("endTime").takeIf { it.isNotBlank() }?.let(LocalTime::parse)))
            }
        }
        return DeviceManifest(root.optLong("version"), root.optString("screenId"), root.optString("timezone", BuildConfig.DEFAULT_TIMEZONE), items, root.optString("validUntil").takeIf { it.isNotBlank() }?.let(Instant::parse))
    }
}

class ApiProvider(private val store: DeviceStore) { val api: DeviceApi = if (BuildConfig.USE_MOCK_BACKEND) MockDeviceApi() else HttpDeviceApi(BuildConfig.API_BASE_URL) }
