package com.ooro.driver.network

import android.os.Build
import com.ooro.driver.BuildConfig
import com.ooro.driver.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

interface DriverApi {
    suspend fun requestOtp(phone: String)
    suspend fun verifyOtp(phone: String, otp: String): SessionResponse
    suspend fun pairDisplay(code: String, driverId: String, vehicleId: String): DisplayBinding
    suspend fun sendRideEvents(events: List<NormalizedRideEvent>)
    suspend fun sendLocations(samples: List<LocationSample>)
    suspend fun sendProof(proofs: List<ProofOfPlay>)
    suspend fun requestPayout(amountMinor: Long, method: String): PayoutResponse
}
data class SessionResponse(val accessToken: String, val refreshToken: String, val driverId: String, val profile: DriverProfile)
data class PayoutResponse(val id: String, val status: PayoutStatus)

class MockDriverApi : DriverApi {
    override suspend fun requestOtp(phone: String) = Unit
    override suspend fun verifyOtp(phone: String, otp: String): SessionResponse { require(otp == "000000") { "Use 000000 in debug mode" }; return SessionResponse("demo-access", "demo-refresh", "demo-driver", DriverProfile("demo-driver", "OORO Demo Driver", phone, "driver@example.test", "Bengaluru", driverType = DriverType.INDIVIDUAL, kycStatus = VerificationStatus.VERIFIED)) }
    override suspend fun pairDisplay(code: String, driverId: String, vehicleId: String): DisplayBinding { require(code.replace(" ", "").uppercase() in setOf("OORO-DEMO", "742981")) { "Invalid development display code" }; return DisplayBinding("OORO-DEMO", vehicleId, "Demo Display", DisplayState.IDLE_SLEEP, Instant.now(), "1.0.0", 1, networkType = NetworkType.WIFI) }
    override suspend fun sendRideEvents(events: List<NormalizedRideEvent>) = Unit
    override suspend fun sendLocations(samples: List<LocationSample>) = Unit
    override suspend fun sendProof(proofs: List<ProofOfPlay>) = Unit
    override suspend fun requestPayout(amountMinor: Long, method: String) = PayoutResponse("payout-demo", PayoutStatus.PROCESSING)
}

class HttpDriverApi(private val baseUrl: String, private val token: () -> String?) : DriverApi {
    private fun data(response: String): JSONObject = JSONObject(response).optJSONObject("data") ?: JSONObject(response)
    private suspend fun request(path: String, method: String, body: String? = null): String = withContext(Dispatchers.IO) {
        val connection = (URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 10_000; readTimeout = 15_000; setRequestProperty("Accept", "application/json"); token()?.let { setRequestProperty("Authorization", "Bearer $it") }; if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json"); outputStream.use { it.write(body.toByteArray()) } } }
        if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}"); connection.inputStream.bufferedReader().use { it.readText() }
    }
    override suspend fun requestOtp(phone: String) { request("/api/auth/request-otp", "POST", JSONObject().put("phone", phone).toString()) }
    override suspend fun verifyOtp(phone: String, otp: String): SessionResponse { val response = data(request("/api/auth/verify-otp", "POST", JSONObject().put("phone", phone).put("code", otp).toString())); val driver = response.optJSONObject("driver") ?: JSONObject(); val user = response.optJSONObject("user") ?: JSONObject(); val id = driver.optString("id", user.optString("id")); return SessionResponse(response.getString("accessToken"), response.getString("refreshToken"), id, DriverProfile(id, user.optString("name", ""), phone, user.optString("email").takeIf { it.isNotBlank() })) }
    override suspend fun pairDisplay(code: String, driverId: String, vehicleId: String): DisplayBinding { val result = data(request("/api/displays/pair", "POST", JSONObject().put("pairingCode", code.replace(" ", "")).put("vehicleId", vehicleId).toString())); return DisplayBinding(result.getString("displayId"), vehicleId, result.optString("displayName", "OORO Display"), DisplayState.IDLE_SLEEP) }
    override suspend fun sendRideEvents(events: List<NormalizedRideEvent>) { request("/api/mobility/events", "POST", JSONObject().put("events", events.map { JSONObject().put("eventId", it.eventId).put("provider", it.provider).put("eventType", it.eventType.name).put("timestamp", it.timestamp.toString()).put("confidence", it.confidence) }).toString()) }
    override suspend fun sendLocations(samples: List<LocationSample>) { samples.groupBy { it.rideId }.forEach { (rideId, points) -> request("/api/rides/$rideId/locations", "POST", JSONObject().put("points", points.map { JSONObject().put("timestamp", it.timestamp.toString()).put("latitude", it.latitude).put("longitude", it.longitude).put("accuracy", it.accuracyMeters).put("speed", it.speedMps).put("bearing", it.bearing) }).toString()) } }
    override suspend fun sendProof(proofs: List<ProofOfPlay>) { request("/api/device/proof-of-play", "POST", JSONObject().put("events", proofs.map { JSONObject().put("proofId", it.proofId).put("rideId", it.rideId).put("displayId", it.displayId).put("creativeId", it.creativeId).put("playbackStartedAt", it.playbackStartedAt.toString()).put("playbackEndedAt", it.playbackEndedAt?.toString()).put("expectedDuration", it.expectedDurationSeconds).put("actualDuration", it.actualDurationSeconds).put("manifestVersion", it.manifestVersion).put("playerVersion", it.playerVersion).put("playbackCompleted", it.playbackCompleted) }).toString()) }
    override suspend fun requestPayout(amountMinor: Long, method: String): PayoutResponse { val result = data(request("/api/payouts", "POST", JSONObject().put("amountMinor", amountMinor).put("payoutMethodId", method).put("idempotencyKey", "android-${System.currentTimeMillis()}-$amountMinor").toString())); return PayoutResponse(result.getString("id"), PayoutStatus.valueOf(result.optString("status", "PROCESSING"))) }
}

class ApiProvider(private val session: SecureTokenProvider) { val api: DriverApi = if (BuildConfig.USE_MOCK_BACKEND) MockDriverApi() else HttpDriverApi(BuildConfig.API_BASE_URL) { session.token() } }
interface SecureTokenProvider { fun token(): String? }
