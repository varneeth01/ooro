package com.ooro.screenplayer.api

import com.ooro.screenplayer.BuildConfig
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.DayOfWeek
import java.time.LocalTime

data class DeviceCommand(val id: String, val type: String, val payload: JSONObject?, val expiresAt: Instant?)
data class CommandResult(val commandId: String, val deviceId: String, val status: String, val receivedAt: Instant, val startedAt: Instant?, val completedAt: Instant?, val errorCode: String? = null, val errorMessage: String? = null)
interface DeviceApi { suspend fun pair(request: PairRequest): PairResponse; suspend fun manifest(credentials: DeviceCredentials): DeviceManifest; suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long); suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>); suspend fun pendingCommands(credentials: DeviceCredentials): List<DeviceCommand> = emptyList(); suspend fun acknowledgeCommand(credentials: DeviceCredentials, result: CommandResult) {}; suspend fun unpair(credentials: DeviceCredentials) }

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
        val status = connection.responseCode
        if (status !in 200..299) {
            val errorBody = runCatching { (connection.errorStream ?: connection.inputStream).bufferedReader().use { it.readText() } }.getOrDefault("")
            val detail = runCatching { JSONObject(errorBody).optJSONObject("error")?.optString("code") }.getOrNull().orEmpty()
            error("HTTP $status $path${detail.takeIf { it.isNotBlank() }?.let { " [$it]" } ?: ""}")
        }
        return@withContext connection.inputStream.bufferedReader().use { it.readText() }
    }
    override suspend fun pair(request: PairRequest): PairResponse { val json = request.toJson(); val body = request("/api/device/pair", "POST", null, json); val envelope = JSONObject(body); val obj = envelope.optJSONObject("data") ?: envelope; return PairResponse(DeviceCredentials(request.deviceId, obj.getString("screenId"), obj.optString("workspaceId"), obj.getString("deviceToken"), obj.optString("deviceName", "OORO Screen"))) }
    override suspend fun manifest(credentials: DeviceCredentials): DeviceManifest { val envelope = JSONObject(request("/api/device/manifest", "GET", credentials.token)); return ManifestCodec.parse((envelope.optJSONObject("data") ?: envelope).toString()) }
    override suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long) { request("/api/device/heartbeat", "POST", credentials.token, JSONObject().put("screenId", credentials.screenId).put("deviceId", credentials.deviceId).put("status", status.name).put("screenState", status.name).put("manifestVersion", manifestVersion).put("appVersion", BuildConfig.VERSION_NAME).put("networkConnected", true).put("timestamp", Instant.now().toString()).toString()) }
    override suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>) {
        val payload = JSONArray().apply {
            events.forEach { event ->
                put(JSONObject().put("eventId", event.eventId).put("proofId", event.eventId).put("screenId", event.screenId).put("deviceId", event.deviceId).put("campaignId", event.campaignId).put("creativeId", event.creativeId).put("scheduleItemId", event.scheduleItemId).put("startedAt", event.startedAt.toString()).put("endedAt", event.endedAt.toString()).put("expectedDuration", event.expectedDurationMs / 1000).put("actualDuration", event.actualPlayedMs / 1000).put("playbackCompleted", event.success).put("success", event.success).put("appVersion", event.appVersion))
            }
        }
        request("/api/device/proof-of-play", "POST", credentials.token, JSONObject().put("events", payload).toString())
    }
    override suspend fun pendingCommands(credentials: DeviceCredentials): List<DeviceCommand> { val root = JSONObject(request("/api/device/commands", "GET", credentials.token)); val values = root.optJSONArray("data") ?: root.optJSONArray("commands") ?: org.json.JSONArray(); return (0 until values.length()).map { val j = values.getJSONObject(it); val expiresAt = j.optString("expiresAt").takeIf { value -> value.isNotBlank() && value != "null" }?.let(Instant::parse); DeviceCommand(j.getString("id"), j.getString("commandType"), j.optJSONObject("payload"), expiresAt) } }
    override suspend fun acknowledgeCommand(credentials: DeviceCredentials, result: CommandResult) { request("/api/device/commands/${result.commandId}/ack", "POST", credentials.token, JSONObject().put("status", result.status).put("receivedAt", result.receivedAt.toString()).put("startedAt", result.startedAt?.toString()).put("completedAt", result.completedAt?.toString()).put("errorCode", result.errorCode).put("errorMessage", result.errorMessage).toString()) }
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
        val layout = runCatching { DisplayLayout.valueOf(root.optString("layout", "FULLSCREEN_AD").uppercase()) }.getOrDefault(DisplayLayout.FULLSCREEN_AD)
        return DeviceManifest(root.optLong("version"), root.optString("screenId"), root.optString("timezone", BuildConfig.DEFAULT_TIMEZONE), items, root.optString("validUntil").takeIf { it.isNotBlank() }?.let(Instant::parse), layout)
    }
    fun encode(manifest: DeviceManifest): String = JSONObject().put("version", manifest.version).put("screenId", manifest.screenId).put("timezone", manifest.timezone).put("layout", manifest.layout.name).put("validUntil", manifest.validUntil?.toString()).put("items", org.json.JSONArray(manifest.items.map { JSONObject().put("id", it.id).put("campaignId", it.campaignId).put("creativeId", it.creativeId).put("type", it.type.name.lowercase()).put("url", it.url).put("checksum", it.checksum).put("durationSeconds", it.durationSeconds).put("priority", it.priority).put("startAt", it.startAt?.toString()).put("endAt", it.endAt?.toString()).put("daysOfWeek", org.json.JSONArray(it.daysOfWeek.map { day -> day.value })).put("startTime", it.startTime?.toString()).put("endTime", it.endTime?.toString()) })).toString()
}

class ApiProvider(private val store: DeviceStore) { val api: DeviceApi = if (BuildConfig.USE_MOCK_BACKEND) MockDeviceApi() else HttpDeviceApi(BuildConfig.API_BASE_URL) }
