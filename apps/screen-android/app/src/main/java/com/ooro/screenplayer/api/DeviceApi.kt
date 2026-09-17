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
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException
import java.time.Instant
import java.time.DayOfWeek
import java.time.LocalTime

data class DeviceCommand(val id: String, val type: String, val payload: JSONObject?, val expiresAt: Instant?)
data class CommandResult(val commandId: String, val deviceId: String, val status: String, val receivedAt: Instant, val startedAt: Instant?, val completedAt: Instant?, val errorCode: String? = null, val errorMessage: String? = null)
enum class DeviceFailureKind { DNS_ERROR, CONNECTION_REFUSED, TIMEOUT, TLS_ERROR, NETWORK_UNAVAILABLE, AUTH_EXPIRED, AUTH_INVALID, AUTH_REVOKED, DEVICE_NOT_FOUND, PAIRING_REQUIRED, SERVER_UNAVAILABLE, REQUEST_FAILED }

class DeviceApiException(val kind: DeviceFailureKind, val status: Int? = null, val endpoint: String, cause: Throwable? = null) : IOException(kind.name, cause)

internal fun classifyDeviceFailure(status: Int, code: String?): DeviceFailureKind = when {
    status >= 500 -> DeviceFailureKind.SERVER_UNAVAILABLE
    status == 401 && code in setOf("DEVICE_AUTH_EXPIRED", "TOKEN_EXPIRED", "AUTH_EXPIRED") -> DeviceFailureKind.AUTH_EXPIRED
    status == 401 && code in setOf("DEVICE_REVOKED", "AUTH_REVOKED") -> DeviceFailureKind.AUTH_REVOKED
    status == 401 -> DeviceFailureKind.AUTH_INVALID
    status == 404 && code == "DEVICE_NOT_FOUND" -> DeviceFailureKind.DEVICE_NOT_FOUND
    status == 404 -> DeviceFailureKind.PAIRING_REQUIRED
    else -> DeviceFailureKind.REQUEST_FAILED
}
internal fun classifyNetworkFailure(error: Throwable): DeviceFailureKind {
    val cause = generateSequence(error) { it.cause }.firstOrNull { it is UnknownHostException || it is ConnectException || it is SocketTimeoutException || it is SSLException }
    return when (cause) {
        is UnknownHostException -> DeviceFailureKind.DNS_ERROR
        is ConnectException -> DeviceFailureKind.CONNECTION_REFUSED
        is SocketTimeoutException -> DeviceFailureKind.TIMEOUT
        is SSLException -> DeviceFailureKind.TLS_ERROR
        else -> DeviceFailureKind.NETWORK_UNAVAILABLE
    }
}

interface DeviceApi { suspend fun health(); suspend fun pair(request: PairRequest): PairResponse; suspend fun manifest(credentials: DeviceCredentials): DeviceManifest; suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long, telemetry: HeartbeatTelemetry = HeartbeatTelemetry()); suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>); suspend fun pendingCommands(credentials: DeviceCredentials): List<DeviceCommand> = emptyList(); suspend fun acknowledgeCommand(credentials: DeviceCredentials, result: CommandResult) {}; suspend fun unpair(credentials: DeviceCredentials) }

class MockDeviceApi : DeviceApi {
    override suspend fun health() = Unit
    override suspend fun pair(request: PairRequest) = PairResponse(DeviceCredentials(request.deviceId, "demo-screen", "demo-workspace", "demo-token-${request.deviceId}", "Demo Screen"))
    override suspend fun manifest(credentials: DeviceCredentials) = DeviceManifest(1, credentials.screenId, BuildConfig.DEFAULT_TIMEZONE, listOf(ManifestItem("demo-image", "demo-campaign", "demo-creative", CreativeType.IMAGE, "", null, 8, 1, null, null, emptySet(), null, null, "demo-asset")), null)
    override suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long, telemetry: HeartbeatTelemetry) = Unit
    override suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>) = Unit
    override suspend fun unpair(credentials: DeviceCredentials) = Unit
}

class HttpDeviceApi(private val baseUrl: String) : DeviceApi {
    init { require(BuildConfig.DEBUG || baseUrl.startsWith("https://")) { "Release screen builds require HTTPS" } }
    private suspend fun request(path: String, method: String, token: String?, body: String? = null): String = withContext(Dispatchers.IO) {
        val connection = try { (URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 10_000; readTimeout = 15_000; setRequestProperty("Accept", "application/json"); token?.let { setRequestProperty("Authorization", "Bearer $it") }; if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json"); outputStream.use { it.write(body.toByteArray()) } } } } catch (error: IOException) { throw DeviceApiException(classifyNetworkFailure(error), endpoint = path, cause = error) }
        val status = try { connection.responseCode } catch (error: IOException) { throw DeviceApiException(classifyNetworkFailure(error), endpoint = path, cause = error) }
        if (status !in 200..299) {
            val errorBody = runCatching { (connection.errorStream ?: connection.inputStream).bufferedReader().use { it.readText() } }.getOrDefault("")
            val detail = runCatching { JSONObject(errorBody).optJSONObject("error")?.optString("code") }.getOrNull().orEmpty()
            throw DeviceApiException(classifyDeviceFailure(status, detail.takeIf { it.isNotBlank() }), status, path)
        }
        return@withContext connection.inputStream.bufferedReader().use { it.readText() }
    }
    override suspend fun health() { request("/api/health", "GET", null) }
    override suspend fun pair(request: PairRequest): PairResponse { val json = request.toJson(); val body = request("/api/device/pair", "POST", null, json); val envelope = JSONObject(body); val obj = envelope.optJSONObject("data") ?: envelope; return PairResponse(DeviceCredentials(request.deviceId, obj.getString("screenId"), obj.optString("workspaceId"), obj.getString("deviceToken"), obj.optString("deviceName", "OORO Screen"))) }
    override suspend fun manifest(credentials: DeviceCredentials): DeviceManifest { val envelope = JSONObject(request("/api/device/manifest", "GET", credentials.token)); return ManifestCodec.parse((envelope.optJSONObject("data") ?: envelope).toString()) }
    override suspend fun heartbeat(credentials: DeviceCredentials, status: PlayerStatus, manifestVersion: Long, telemetry: HeartbeatTelemetry) { val location = telemetry.location; request("/api/device/heartbeat", "POST", credentials.token, JSONObject().put("screenId", credentials.screenId).put("deviceId", credentials.deviceId).put("status", status.name).put("screenState", status.name).put("playbackState", telemetry.playbackState).put("manifestVersion", manifestVersion).put("appVersion", BuildConfig.VERSION_NAME).put("androidVersion", android.os.Build.VERSION.RELEASE).put("manufacturer", android.os.Build.MANUFACTURER).put("model", android.os.Build.MODEL).put("currentCampaignId", telemetry.campaignId).put("currentCreativeId", telemetry.creativeId).put("currentAssetId", telemetry.assetId).put("playbackStartedAt", telemetry.playbackStartedAt?.toString()).put("playbackPositionMs", telemetry.playbackPositionMs).put("expectedDurationMs", telemetry.expectedDurationMs).put("latitude", location?.latitude).put("longitude", location?.longitude).put("accuracyMeters", location?.accuracyMeters).put("speedMps", location?.speedMps).put("headingDegrees", location?.headingDegrees).put("locationOccurredAt", location?.occurredAt?.let { Instant.ofEpochMilli(it).toString() }).put("timestamp", Instant.now().toString()).toString()) }
    override suspend fun uploadProof(credentials: DeviceCredentials, events: List<ProofOfPlay>) {
        val payload = JSONArray().apply {
            events.forEach { event ->
                put(JSONObject().put("eventId", event.eventId).put("proofId", event.eventId).put("screenId", event.screenId).put("deviceId", event.deviceId).put("campaignId", event.campaignId).put("creativeId", event.creativeId).put("assetId", event.assetId).put("scheduleItemId", event.scheduleItemId).put("startedAt", event.startedAt.toString()).put("endedAt", event.endedAt.toString()).put("expectedDuration", event.expectedDurationMs / 1000).put("actualDuration", event.actualPlayedMs / 1000).put("playbackCompleted", event.success).put("success", event.success).put("appVersion", event.appVersion))
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
                val offerJson = item.optJSONObject("offer") ?: JSONObject()
                val cta = runCatching { CtaType.valueOf(offerJson.optString("ctaType").uppercase()) }.getOrNull()
                val offer = OfferMetadata(offerJson.optString("brandName").takeIf { it.isNotBlank() }, offerJson.optString("offerTitle").takeIf { it.isNotBlank() }, offerJson.optString("offerSubtitle").takeIf { it.isNotBlank() }, offerJson.optString("offerValue").takeIf { it.isNotBlank() }, cta, offerJson.optString("ctaLabel").takeIf { it.isNotBlank() }, offerJson.optString("ctaUrl").takeIf { it.isNotBlank() }, offerJson.optString("qrUrl").takeIf { it.isNotBlank() }, offerJson.optString("secondaryCtaLabel").takeIf { it.isNotBlank() }, offerJson.optString("secondaryCtaUrl").takeIf { it.isNotBlank() }, offerJson.optString("contactPhone").takeIf { it.isNotBlank() }, offerJson.optString("contactUrl").takeIf { it.isNotBlank() }, offerJson.optInt("scanCount", -1).takeIf { it >= 0 }, offerJson.optBoolean("scanCountDisplayEnabled", false), offerJson.optString("accentColor").takeIf { it.isNotBlank() })
                val fitMode = runCatching { FitMode.valueOf(item.optString("fitMode", "FIT").uppercase()) }.getOrDefault(FitMode.FIT)
                add(ManifestItem(item.getString("id"), item.optString("campaignId"), item.optString("creativeId"), if (item.optString("type").lowercase() == "video") CreativeType.VIDEO else CreativeType.IMAGE, item.getString("url"), item.optString("checksum").takeIf { it.isNotBlank() }, item.optInt("durationSeconds", 10), item.optInt("priority", 0), item.optString("startAt").takeIf { it.isNotBlank() }?.let(Instant::parse), item.optString("endAt").takeIf { it.isNotBlank() }?.let(Instant::parse), days, item.optString("startTime").takeIf { it.isNotBlank() }?.let(LocalTime::parse), item.optString("endTime").takeIf { it.isNotBlank() }?.let(LocalTime::parse), item.optString("assetId").takeIf { it.isNotBlank() }, fitMode, offer, item.optInt("playsPerLoop", 1).coerceIn(1, 28)))
            }
        }
        val layoutJson = root.optJSONObject("layout")
        val layoutName = layoutJson?.optString("type") ?: root.optString("layout", "FULLSCREEN_AD")
        val layout = runCatching { DisplayLayout.valueOf(layoutName.uppercase()) }.getOrDefault(DisplayLayout.FULLSCREEN_AD)
        val config = LayoutConfig(layoutJson?.optInt("primaryWidthPercent", 75) ?: 75, layoutJson?.optInt("navigationHeightPercent", 58) ?: 58)
        return DeviceManifest(root.optLong("version"), root.optString("screenId"), root.optString("timezone", BuildConfig.DEFAULT_TIMEZONE), items, root.optString("validUntil").takeIf { it.isNotBlank() }?.let(Instant::parse), layout, config)
    }
    fun encode(manifest: DeviceManifest): String = JSONObject().put("version", manifest.version).put("screenId", manifest.screenId).put("timezone", manifest.timezone).put("layout", JSONObject().put("type", manifest.layout.name).put("primaryWidthPercent", manifest.layoutConfig.primaryWidthPercent).put("navigationHeightPercent", manifest.layoutConfig.navigationHeightPercent)).put("validUntil", manifest.validUntil?.toString()).put("items", org.json.JSONArray(manifest.items.map { item -> JSONObject().put("id", item.id).put("campaignId", item.campaignId).put("creativeId", item.creativeId).put("assetId", item.assetId).put("type", item.type.name.lowercase()).put("url", item.url).put("checksum", item.checksum).put("durationSeconds", item.durationSeconds).put("priority", item.priority).put("playsPerLoop", item.playsPerLoop).put("startAt", item.startAt?.toString()).put("endAt", item.endAt?.toString()).put("daysOfWeek", org.json.JSONArray(item.daysOfWeek.map { day -> day.value })).put("startTime", item.startTime?.toString()).put("endTime", item.endTime?.toString()).put("fitMode", item.fitMode.name).put("offer", JSONObject().put("brandName", item.offer.brandName).put("offerTitle", item.offer.offerTitle).put("offerSubtitle", item.offer.offerSubtitle).put("offerValue", item.offer.offerValue).put("ctaType", item.offer.ctaType?.name).put("ctaLabel", item.offer.ctaLabel).put("ctaUrl", item.offer.ctaUrl).put("qrUrl", item.offer.qrUrl).put("secondaryCtaLabel", item.offer.secondaryCtaLabel).put("secondaryCtaUrl", item.offer.secondaryCtaUrl).put("contactPhone", item.offer.contactPhone).put("contactUrl", item.offer.contactUrl).put("scanCount", item.offer.scanCount).put("scanCountDisplayEnabled", item.offer.scanCountDisplayEnabled).put("accentColor", item.offer.accentColor)) })).toString()
}

class ApiProvider(private val store: DeviceStore) { val api: DeviceApi = if (BuildConfig.USE_MOCK_BACKEND) MockDeviceApi() else HttpDeviceApi(BuildConfig.API_BASE_URL) }
