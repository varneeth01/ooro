package com.ooro.deviceagent.network

import android.os.Build
import com.ooro.deviceagent.BuildConfig
import com.ooro.deviceagent.model.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class DeviceOsApi {
    private val base = BuildConfig.API_BASE_URL.trimEnd('/')
    fun enroll(code: String, capabilities: JSONObject): DeviceCredentials {
        val response = request("/api/deviceos/enroll", "POST", null, JSONObject().put("pairingCode", code).put("agentVersionName", BuildConfig.VERSION_NAME).put("agentVersionCode", BuildConfig.VERSION_CODE).put("androidVersion", Build.VERSION.RELEASE).put("manufacturer", Build.MANUFACTURER).put("model", Build.MODEL).put("capabilities", capabilities))
        val data = response.getJSONObject("data")
        return DeviceCredentials(data.getString("managedDeviceId"), data.getString("displayId"), data.getString("credentialId"), data.getString("deviceToken"))
    }
    fun rotateCredential(credentials: DeviceCredentials): DeviceCredentials {
        val data = request("/api/deviceos/rotate-credential", "POST", credentials.token, JSONObject().put("requestId", java.util.UUID.randomUUID().toString())).getJSONObject("data")
        return DeviceCredentials(data.getString("managedDeviceId"), data.getString("displayId"), data.getString("credentialId"), data.getString("deviceToken"))
    }
    fun state(credentials: DeviceCredentials): List<DeploymentTarget> {
        val data = request("/api/deviceos/state", "GET", credentials.token, null).getJSONObject("data")
        val targets = data.optJSONArray("targets") ?: JSONArray()
        return (0 until targets.length()).map { index ->
            val item = targets.getJSONObject(index); val campaign = item.getJSONObject("campaign"); val releaseJson = campaign.getJSONObject("release")
            DeploymentTarget(item.getString("id"), item.getString("state"), campaign.optString("state", "ACTIVE"), item.optInt("attemptCount", 0) + 1, item.optString("nextAttemptAt").takeIf { it.isNotBlank() }, campaign.optString("maintenanceWindowStart").takeIf { it.isNotBlank() }, campaign.optString("maintenanceWindowEnd").takeIf { it.isNotBlank() }, Release(releaseJson.getString("id"), releaseJson.getString("packageName"), releaseJson.getString("versionCode").toLong(), releaseJson.getString("versionName"), releaseJson.getInt("minSdk"), releaseJson.getInt("targetSdk"), releaseJson.getString("sha256"), releaseJson.getString("certificateSha256"), releaseJson.getString("sizeBytes").toLong()))
        }
    }
    fun heartbeat(credentials: DeviceCredentials, inventory: JSONArray, capabilities: JSONObject) { request("/api/deviceos/heartbeat", "POST", credentials.token, JSONObject().put("requestId", java.util.UUID.randomUUID().toString()).put("agentVersionName", BuildConfig.VERSION_NAME).put("agentVersionCode", BuildConfig.VERSION_CODE).put("androidVersion", Build.VERSION.RELEASE).put("manufacturer", Build.MANUFACTURER).put("model", Build.MODEL).put("capabilities", capabilities).put("inventory", inventory)) }
    fun commands(credentials: DeviceCredentials): List<DeviceOsCommand> {
        val commands = request("/api/deviceos/commands", "GET", credentials.token, null).getJSONObject("data").optJSONArray("items") ?: JSONArray()
        return (0 until commands.length()).map { index ->
            val item = commands.getJSONObject(index)
            DeviceOsCommand(item.getString("id"), item.getString("commandType"), item.getString("packageName"), item.optJSONObject("payload"), item.optString("expiresAt").takeIf { it.isNotBlank() })
        }
    }
    fun acknowledgeCommand(credentials: DeviceCredentials, commandId: String, status: String, errorCode: String? = null, errorMessage: String? = null, metadata: JSONObject? = null) {
        val body = JSONObject().put("status", status)
        if (errorCode != null) body.put("errorCode", errorCode)
        if (errorMessage != null) body.put("errorMessage", errorMessage)
        if (metadata != null) body.put("metadata", metadata)
        request("/api/deviceos/commands/$commandId/ack", "POST", credentials.token, body)
    }
    fun report(credentials: DeviceCredentials, targetId: String, state: String, idempotencyKey: String, fields: JSONObject = JSONObject()) { request("/api/deviceos/targets/$targetId/events", "POST", credentials.token, fields.put("state", state).put("idempotencyKey", idempotencyKey)) }
    fun download(credentials: DeviceCredentials, releaseId: String, destination: File, expectedBytes: Long): Long {
        var existing = if (destination.exists()) destination.length() else 0L
        if (existing > expectedBytes) { destination.delete(); existing = 0L }
        val downloadUrl = request("/api/deviceos/releases/$releaseId/download-url", "GET", credentials.token, null).getJSONObject("data").getString("url")
        val connection = openAbsolute(downloadUrl).apply { if (existing > 0) setRequestProperty("Range", "bytes=$existing-"); connectTimeout = 15_000; readTimeout = 60_000 }
        val status = connection.responseCode
        if (status !in 200..299 && status != 206) error("DOWNLOAD_HTTP_$status")
        if (existing > 0 && status == 200) { destination.delete(); existing = 0L }
        if (existing > 0 && status == 206 && !resumeRangeStartsAt(connection.getHeaderField("Content-Range"), existing)) error("DOWNLOAD_RANGE_MISMATCH")
        val mode = if (existing > 0) "rw" else "rw"
        RandomAccessFile(destination, mode).use { file -> file.seek(existing); connection.inputStream.use { input -> val buffer = ByteArray(64 * 1024); var total = existing; while (true) { val read = input.read(buffer); if (read < 0) break; file.write(buffer, 0, read); total += read }; if (total != expectedBytes) error("DOWNLOAD_SIZE_MISMATCH"); return total } }
    }
    private fun request(path: String, method: String, token: String?, body: JSONObject?): JSONObject { val connection = open(path, method, token); if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toString().toByteArray()) } }; val status = connection.responseCode; val text = (if (status in 200..299) connection.inputStream else connection.errorStream).bufferedReader().use { it.readText() }; if (status !in 200..299) error("API_$status:${runCatching { JSONObject(text).optJSONObject("error")?.optString("code") }.getOrNull()}"); return JSONObject(text) }
    private fun open(path: String, method: String, token: String?): HttpURLConnection = (URL(base + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 15_000; readTimeout = 30_000; setRequestProperty("Accept", "application/json"); if (bodyMethod(method)) setRequestProperty("Content-Type", "application/json"); if (token != null) setRequestProperty("Authorization", "Bearer $token") }
    private fun openAbsolute(url: String): HttpURLConnection = (URL(url).openConnection() as HttpURLConnection).apply { requestMethod = "GET"; setRequestProperty("Accept", "application/vnd.android.package-archive") }
    private fun bodyMethod(method: String) = method == "POST" || method == "PUT"
}

fun resumeRangeStartsAt(contentRange: String?, expectedStart: Long): Boolean {
    val match = contentRange?.trim()?.let { Regex("bytes (\\d+)-\\d+/(?:\\d+|\\*)").matchEntire(it) } ?: return false
    val start = match.groupValues.drop(1).firstOrNull { it.isNotEmpty() }?.toLongOrNull() ?: return false
    return start == expectedStart
}

fun sha256(file: File): String { val digest = MessageDigest.getInstance("SHA-256"); file.inputStream().use { input -> val buffer = ByteArray(64 * 1024); while (true) { val read = input.read(buffer); if (read < 0) break; digest.update(buffer, 0, read) } }; return digest.digest().joinToString("") { "%02x".format(it) } }
