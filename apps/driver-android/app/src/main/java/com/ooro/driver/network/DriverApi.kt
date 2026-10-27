package com.ooro.driver.network

import android.os.Build
import com.ooro.driver.BuildConfig
import com.ooro.driver.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.security.MessageDigest
import android.util.Base64

interface DriverApi {
    suspend fun requestOtp(phone: String)
    suspend fun verifyOtp(phone: String, otp: String): SessionResponse
    suspend fun pairDisplay(code: String, driverId: String, vehicleId: String): DisplayBinding
    suspend fun assignedVehicleId(): String? = null
    suspend fun sendRideEvents(events: List<NormalizedRideEvent>)
    suspend fun sendLocations(samples: List<LocationSample>)
    suspend fun sendProof(proofs: List<ProofOfPlay>)
    suspend fun requestPayout(amountMinor: Long, method: String): PayoutResponse
    suspend fun activationEligibility(): ActivationEligibility
    suspend fun registerDevice(installationId: String, appVersion: String, androidVersion: String, manufacturer: String, model: String)
    suspend fun startDuty(installationId: String, idempotencyKey: String): DutySessionSummary
    suspend fun stopDuty(sessionId: String, reason: String, idempotencyKey: String): DutySessionSummary
    suspend fun sendDutyLocations(sessionId: String, samples: List<DutyLocationSample>)
    suspend fun setMobilityProvider(provider: String, enabled: Boolean)
    suspend fun setPermission(permission: String, granted: Boolean)
    suspend fun updateProfile(name: String, email: String?, city: String, language: String)
    suspend fun uploadDocument(documentType: String, contentType: String, content: ByteArray, onProgress: (Int) -> Unit = {}): String
    suspend fun requiredAgreements(): List<AgreementSummary>
    suspend fun acceptAgreement(versionId: String): AgreementSummary
    suspend fun submitOnboarding(): String
    suspend fun createBeneficiary(type: String, value: String): String
    suspend fun createVehicle(type: String, registrationNumber: String, manufacturer: String, model: String): String
    suspend fun currentDuty(): DutySessionSummary?
    suspend fun dashboard(): DriverDashboardSnapshot
    suspend fun onboardingStatus(): OnboardingStatusSnapshot
    suspend fun createSupportTicket(category: String, description: String): String
}
data class AgreementSummary(val id: String, val type: String, val version: String, val contentUrl: String? = null, val contentHash: String? = null, val accepted: Boolean = false)
data class OnboardingDocumentStatus(val type: String, val status: String, val rejectionReason: String?)
data class OnboardingReviewStatus(val decision: String, val reason: String?, val createdAt: Instant)
data class OnboardingStatusSnapshot(val onboardingStatus: String, val accountStatus: String, val documents: List<OnboardingDocumentStatus>, val reviews: List<OnboardingReviewStatus>)
data class RideTimelineItem(val id: String, val provider: String, val state: String, val verificationStatus: String, val updatedAt: Instant, val source: String)
data class PayoutHistoryItem(val id: String, val amountMinor: Long, val status: String, val createdAt: Instant, val method: String)
data class DriverDashboardSnapshot(val name: String, val onboardingStatus: String, val accountStatus: String, val city: String?, val vehicleLabel: String?, val vehicleStatus: String?, val displayLabel: String?, val displayState: String?, val duty: DutySessionSummary?, val lastLocationAt: Instant?, val lastEventAt: Instant?, val notificationState: String, val locationState: String, val availableMinor: Long, val pendingMinor: Long, val settledMinor: Long, val rides: List<RideTimelineItem>, val payouts: List<PayoutHistoryItem>, val beneficiaryStatus: String?, val permissions: Map<String, Boolean>)
data class SessionResponse(val accessToken: String, val refreshToken: String, val driverId: String, val profile: DriverProfile)
data class PayoutResponse(val id: String, val status: PayoutStatus)

class MockDriverApi(private val scenarioProvider: () -> String = { "APPROVED" }) : DriverApi {
    private fun scenario() = scenarioProvider().uppercase()
    override suspend fun requestOtp(phone: String) = Unit
    override suspend fun verifyOtp(phone: String, otp: String): SessionResponse { require(otp == "000000") { "Use 000000 in debug mode" }; return SessionResponse("demo-access", "demo-refresh", "demo-driver", DriverProfile("demo-driver", "OORO Demo Driver", phone, "driver@example.test", "Bengaluru", driverType = DriverType.INDIVIDUAL, kycStatus = VerificationStatus.PENDING)) }
    override suspend fun assignedVehicleId(): String? = "demo-vehicle"
    override suspend fun pairDisplay(code: String, driverId: String, vehicleId: String): DisplayBinding { require(code.replace(" ", "").uppercase() in setOf("OORO-DEMO", "742981")) { "Invalid development display code" }; return DisplayBinding("OORO-DEMO", vehicleId, "Demo Display", DisplayState.IDLE_SLEEP, Instant.now(), "1.0.0", 1, networkType = NetworkType.WIFI) }
    override suspend fun sendRideEvents(events: List<NormalizedRideEvent>) = Unit
    override suspend fun sendLocations(samples: List<LocationSample>) = Unit
    override suspend fun sendProof(proofs: List<ProofOfPlay>) = Unit
    override suspend fun requestPayout(amountMinor: Long, method: String) = PayoutResponse("payout-demo", PayoutStatus.PROCESSING)
    override suspend fun activationEligibility(): ActivationEligibility = when (scenario()) {
        "APPROVED" -> ActivationEligibility(true, emptyList(), true)
        "APPROVED_NO_DISPLAY" -> ActivationEligibility(false, listOf("DISPLAY_ASSIGNMENT_REQUIRED"), false)
        "SUSPENDED" -> ActivationEligibility(false, listOf("ACCOUNT_SUSPENDED"), false)
        else -> ActivationEligibility(false, listOf("DRIVER_REVIEW_INCOMPLETE"), false)
    }
    override suspend fun registerDevice(installationId: String, appVersion: String, androidVersion: String, manufacturer: String, model: String) = Unit
    override suspend fun startDuty(installationId: String, idempotencyKey: String) = DutySessionSummary("duty-demo", "ACTIVE", Instant.now())
    override suspend fun stopDuty(sessionId: String, reason: String, idempotencyKey: String) = DutySessionSummary(sessionId, "ENDED", Instant.now(), Instant.now())
    override suspend fun sendDutyLocations(sessionId: String, samples: List<DutyLocationSample>) = Unit
    override suspend fun setMobilityProvider(provider: String, enabled: Boolean) = Unit
    override suspend fun setPermission(permission: String, granted: Boolean) = Unit
    override suspend fun updateProfile(name: String, email: String?, city: String, language: String) = Unit
    override suspend fun uploadDocument(documentType: String, contentType: String, content: ByteArray, onProgress: (Int) -> Unit) = "demo-document"
    override suspend fun requiredAgreements() = listOf(AgreementSummary("demo-agreement", "DRIVER_PARTICIPATION", "1.0", contentHash = "development-manual-review"))
    override suspend fun acceptAgreement(versionId: String) = AgreementSummary(versionId, "DRIVER_PARTICIPATION", "1.0", contentHash = "development-manual-review", accepted = true)
    override suspend fun submitOnboarding() = "SUBMITTED"
    override suspend fun createBeneficiary(type: String, value: String) = "demo-beneficiary"
    override suspend fun createVehicle(type: String, registrationNumber: String, manufacturer: String, model: String) = "demo-vehicle"
    override suspend fun currentDuty(): DutySessionSummary? = null
    override suspend fun dashboard(): DriverDashboardSnapshot {
        if (scenario() == "OFFLINE") error("Mock backend unavailable")
        val approved = scenario() == "APPROVED" || scenario() == "APPROVED_NO_DISPLAY"
        val suspended = scenario() == "SUSPENDED"
        return DriverDashboardSnapshot("OORO Demo Driver", if (approved) "APPROVED" else if (scenario() == "REJECTED") "REJECTED" else "SUBMITTED", if (suspended) "SUSPENDED" else if (approved) "ACTIVE" else "PENDING", "Bengaluru", "Demo vehicle", if (approved) "VERIFIED" else "PENDING", if (scenario() == "APPROVED_NO_DISPLAY") null else "Demo Display", if (scenario() == "APPROVED_NO_DISPLAY") null else "READY", null, null, null, "ENABLED", "GRANTED", 0, 0, 0, emptyList(), emptyList(), "PENDING", mapOf("LOCATION" to true, "DATA_PROCESSING" to true))
    }
    override suspend fun onboardingStatus(): OnboardingStatusSnapshot = when (scenario()) {
        "APPROVED", "APPROVED_NO_DISPLAY" -> OnboardingStatusSnapshot("APPROVED", "ACTIVE", emptyList(), emptyList())
        "REJECTED" -> OnboardingStatusSnapshot("REJECTED", "PENDING", listOf(OnboardingDocumentStatus("PAN", "REJECTED", "Document is not readable")), emptyList())
        "CHANGES_REQUESTED" -> OnboardingStatusSnapshot("CHANGES_REQUESTED", "PENDING", listOf(OnboardingDocumentStatus("DRIVING_LICENCE", "REJECTED", "Upload the front and back clearly")), emptyList())
        "SUSPENDED" -> OnboardingStatusSnapshot("APPROVED", "SUSPENDED", emptyList(), emptyList())
        else -> OnboardingStatusSnapshot("SUBMITTED", "PENDING", emptyList(), emptyList())
    }
    override suspend fun createSupportTicket(category: String, description: String) = "support-demo"
}

class HttpDriverApi(private val baseUrl: String, private val token: () -> String?) : DriverApi {
    private fun data(response: String): JSONObject = JSONObject(response).optJSONObject("data") ?: JSONObject(response)
    private fun arrayData(response: String): org.json.JSONArray = JSONObject(response).optJSONArray("data") ?: org.json.JSONArray(response)
    private suspend fun request(path: String, method: String, body: String? = null): String = withContext(Dispatchers.IO) {
        val connection = (URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 10_000; readTimeout = 15_000; setRequestProperty("Accept", "application/json"); token()?.let { setRequestProperty("Authorization", "Bearer $it") }; if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json"); outputStream.use { it.write(body.toByteArray()) } } }
        if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}"); connection.inputStream.bufferedReader().use { it.readText() }
    }
    override suspend fun requestOtp(phone: String) { request("/api/auth/request-otp", "POST", JSONObject().put("phone", phone).toString()) }
    override suspend fun verifyOtp(phone: String, otp: String): SessionResponse { val response = data(request("/api/auth/verify-otp", "POST", JSONObject().put("phone", phone).put("code", otp).toString())); val driver = response.optJSONObject("driver") ?: JSONObject(); val user = response.optJSONObject("user") ?: JSONObject(); val id = driver.optString("id", user.optString("id")); return SessionResponse(response.getString("accessToken"), response.getString("refreshToken"), id, DriverProfile(id, user.optString("name", ""), phone, user.optString("email").takeIf { it.isNotBlank() })) }
    override suspend fun pairDisplay(code: String, driverId: String, vehicleId: String): DisplayBinding { val result = data(request("/api/displays/pair", "POST", JSONObject().put("pairingCode", code.replace(" ", "")).put("vehicleId", vehicleId).toString())); return DisplayBinding(result.getString("displayId"), vehicleId, result.optString("displayName", "OORO Display"), DisplayState.IDLE_SLEEP) }
    override suspend fun assignedVehicleId(): String? { val root = data(request("/api/driver/dashboard", "GET")); return root.optJSONArray("vehicles")?.optJSONObject(0)?.optString("id")?.takeIf(String::isNotBlank) }
    override suspend fun sendRideEvents(events: List<NormalizedRideEvent>) { request("/api/mobility/events", "POST", JSONObject().put("events", events.map { JSONObject().put("eventId", it.eventId).put("provider", it.provider).put("eventType", it.eventType.name).put("timestamp", it.timestamp.toString()).put("confidence", it.confidence).put("source", "NOTIFICATION").put("sourcePackage", it.sourcePackage).put("evidenceClass", it.evidence.name).put("diagnosticCode", it.diagnosticCode) }).toString()) }
    override suspend fun sendLocations(samples: List<LocationSample>) { samples.groupBy { it.rideId }.forEach { (rideId, points) -> request("/api/rides/$rideId/locations", "POST", JSONObject().put("points", points.map { JSONObject().put("timestamp", it.timestamp.toString()).put("latitude", it.latitude).put("longitude", it.longitude).put("accuracy", it.accuracyMeters).put("speed", it.speedMps).put("bearing", it.bearing) }).toString()) } }
    override suspend fun sendProof(proofs: List<ProofOfPlay>) { request("/api/device/proof-of-play", "POST", JSONObject().put("events", proofs.map { JSONObject().put("proofId", it.proofId).put("rideId", it.rideId).put("displayId", it.displayId).put("creativeId", it.creativeId).put("playbackStartedAt", it.playbackStartedAt.toString()).put("playbackEndedAt", it.playbackEndedAt?.toString()).put("expectedDuration", it.expectedDurationSeconds).put("actualDuration", it.actualDurationSeconds).put("manifestVersion", it.manifestVersion).put("playerVersion", it.playerVersion).put("playbackCompleted", it.playbackCompleted) }).toString()) }
    override suspend fun requestPayout(amountMinor: Long, method: String): PayoutResponse { val result = data(request("/api/payouts", "POST", JSONObject().put("amountMinor", amountMinor).put("payoutMethodId", method).put("idempotencyKey", "android-${System.currentTimeMillis()}-$amountMinor").toString())); return PayoutResponse(result.getString("id"), PayoutStatus.valueOf(result.optString("status", "PROCESSING"))) }
    override suspend fun activationEligibility(): ActivationEligibility { val result = data(request("/api/driver/activation-eligibility", "GET")); return ActivationEligibility(result.optBoolean("eligible"), (result.optJSONArray("reasons")?.let { array -> (0 until array.length()).map { array.getString(it) } } ?: emptyList()), result.optBoolean("advertisingEligible")) }
    override suspend fun registerDevice(installationId: String, appVersion: String, androidVersion: String, manufacturer: String, model: String) { request("/api/driver/devices", "POST", JSONObject().put("installationId", installationId).put("appVersion", appVersion).put("androidVersion", androidVersion).put("manufacturer", manufacturer).put("model", model).toString()) }
    override suspend fun startDuty(installationId: String, idempotencyKey: String): DutySessionSummary { val result = data(request("/api/driver/duty-sessions", "POST", JSONObject().put("installationId", installationId).put("idempotencyKey", idempotencyKey).toString())); return DutySessionSummary(result.getString("id"), result.getString("status"), Instant.parse(result.getString("startedAt")), result.optString("endedAt").takeIf { it.isNotBlank() }?.let(Instant::parse), result.optString("vehicleId").takeIf { it.isNotBlank() }, result.optString("displayId").takeIf { it.isNotBlank() }) }
    override suspend fun stopDuty(sessionId: String, reason: String, idempotencyKey: String): DutySessionSummary { val result = data(request("/api/driver/duty-sessions/$sessionId/stop", "POST", JSONObject().put("reason", reason).put("idempotencyKey", idempotencyKey).toString())); return DutySessionSummary(result.getString("id"), result.getString("status"), Instant.now(), result.optString("endedAt").takeIf { it.isNotBlank() }?.let(Instant::parse)) }
    override suspend fun sendDutyLocations(sessionId: String, samples: List<DutyLocationSample>) { request("/api/driver/duty-sessions/$sessionId/locations", "POST", JSONObject().put("points", samples.map { JSONObject().put("id", it.id).put("timestamp", it.timestamp.toString()).put("latitude", it.latitude).put("longitude", it.longitude).put("accuracy", it.accuracyMeters).put("speed", it.speedMps).put("bearing", it.bearing) }).toString()) }
    override suspend fun setMobilityProvider(provider: String, enabled: Boolean) { request("/api/driver/mobility/providers/$provider", "PATCH", JSONObject().put("enabled", enabled).put("parserVersion", 1).toString()) }
    override suspend fun setPermission(permission: String, granted: Boolean) { request("/api/driver/permissions", "PATCH", JSONObject().put("permission", permission).put("granted", granted).put("source", "ANDROID").toString()) }
    override suspend fun updateProfile(name: String, email: String?, city: String, language: String) { request("/api/drivers/me", "PATCH", JSONObject().put("name", name).put("email", email ?: JSONObject.NULL).put("city", city).put("preferredLanguage", language).toString()) }
    override suspend fun uploadDocument(documentType: String, contentType: String, content: ByteArray, onProgress: (Int) -> Unit): String {
        require(content.size in 1..10 * 1024 * 1024) { "Document must be between 1 byte and 10 MB" }
        val digest = MessageDigest.getInstance("SHA-256").digest(content).joinToString("") { "%02x".format(it) }
        val session = data(request("/api/driver/documents/upload-session", "POST", JSONObject().put("documentType", documentType).put("contentType", contentType).put("sizeBytes", content.size).put("sha256", digest).toString()))
        if (session.optString("uploadMode") == "PRIVATE_SIGNED_URL") {
            val url = session.optString("uploadUrl").takeIf { it.isNotBlank() } ?: error("Upload provider did not return an upload URL")
            withContext(Dispatchers.IO) { (URL(url).openConnection() as HttpURLConnection).apply { requestMethod = "PUT"; doOutput = true; connectTimeout = 10_000; readTimeout = 30_000; setRequestProperty("Content-Type", contentType); setRequestProperty("x-amz-meta-sha256", digest); outputStream.use { output -> content.inputStream().use { input -> val buffer = ByteArray(16 * 1024); var sent = 0; var read = input.read(buffer); while (read >= 0) { currentCoroutineContext().ensureActive(); output.write(buffer, 0, read); sent += read; onProgress(35 + (sent * 60 / content.size)); read = input.read(buffer) } } }; if (responseCode !in 200..299) error("Document upload failed: HTTP $responseCode") } }
            return data(request("/api/driver/documents/${session.getString("uploadSessionId")}/complete", "POST", JSONObject().toString())).getString("id").also { onProgress(100) }
        }
        onProgress(90)
        return data(request("/api/driver/documents/${session.getString("uploadSessionId")}/complete", "POST", JSONObject().put("contentBase64", Base64.encodeToString(content, Base64.NO_WRAP)).toString())).getString("id").also { onProgress(100) }
    }
    override suspend fun requiredAgreements(): List<AgreementSummary> { val array = arrayData(request("/api/agreements/required", "GET")); return (0 until array.length()).map { val row = array.getJSONObject(it); AgreementSummary(row.getString("id"), row.getString("type"), row.getString("version"), row.optString("contentUrl").takeIf(String::isNotBlank), row.optString("contentHash").takeIf(String::isNotBlank)) } }
    override suspend fun acceptAgreement(versionId: String): AgreementSummary { val row = data(request("/api/agreements/$versionId/accept", "POST", JSONObject().toString())); return AgreementSummary(versionId, "DRIVER_PARTICIPATION", row.optString("agreementVersion", "unknown"), contentHash = row.optString("contentHash").takeIf(String::isNotBlank), accepted = true) }
    override suspend fun submitOnboarding(): String { return data(request("/api/driver/onboarding/submit", "POST", JSONObject().toString())).getString("onboardingStatus") }
    override suspend fun createBeneficiary(type: String, value: String): String { return data(request("/api/driver/beneficiaries", "POST", JSONObject().put("type", type).put("value", value).toString())).getString("id") }
    override suspend fun createVehicle(type: String, registrationNumber: String, manufacturer: String, model: String): String { return data(request("/api/vehicles", "POST", JSONObject().put("type", type).put("registrationNumber", registrationNumber).put("manufacturer", manufacturer).put("model", model).toString())).getString("id") }
    override suspend fun currentDuty(): DutySessionSummary? { val raw = request("/api/driver/duty-sessions/current", "GET"); val wrapper = JSONObject(raw); val row = wrapper.optJSONObject("data") ?: return null; return DutySessionSummary(row.getString("id"), row.getString("status"), Instant.parse(row.getString("startedAt")), row.optString("endedAt").takeIf { it.isNotBlank() }?.let(Instant::parse), row.optString("vehicleId").takeIf { it.isNotBlank() }, row.optString("displayId").takeIf { it.isNotBlank() }) }
    override suspend fun dashboard(): DriverDashboardSnapshot {
        val root = data(request("/api/driver/dashboard", "GET")); val profile = root.getJSONObject("profile"); val vehicle = root.optJSONArray("vehicles")?.optJSONObject(0); val display = vehicle?.optJSONArray("displays")?.optJSONObject(0); val dutyRow = root.optJSONObject("duty"); val duty = dutyRow?.let { DutySessionSummary(it.getString("id"), it.getString("status"), Instant.parse(it.getString("startedAt")), it.optString("endedAt").takeIf(String::isNotBlank)?.let(Instant::parse), it.optString("vehicleId").takeIf(String::isNotBlank), it.optString("displayId").takeIf(String::isNotBlank)) }; val earnings = root.getJSONObject("earnings"); val rides = (0 until (root.optJSONArray("rides")?.length() ?: 0)).map { val row = root.getJSONArray("rides").getJSONObject(it); RideTimelineItem(row.getString("id"), row.getString("provider"), row.getString("state"), row.optString("verificationStatus", "PENDING"), Instant.parse(row.getString("updatedAt")), row.optString("source", "UNKNOWN")) }; val payouts = (0 until (root.optJSONArray("payouts")?.length() ?: 0)).map { val row = root.getJSONArray("payouts").getJSONObject(it); PayoutHistoryItem(row.getString("id"), row.getString("amountMinor").toLong(), row.getString("status"), Instant.parse(row.getString("createdAt")), row.optJSONObject("payoutMethod")?.optString("maskedValue", "") ?: "") }; val permissions = mutableMapOf<String, Boolean>(); (0 until (root.optJSONArray("permissions")?.length() ?: 0)).forEach { val row = root.getJSONArray("permissions").getJSONObject(it); permissions[row.getString("permission")] = row.optBoolean("granted") && row.isNull("revokedAt") }; return DriverDashboardSnapshot(profile.getString("name"), profile.getString("onboardingStatus"), profile.getString("accountStatus"), profile.optString("city").takeIf(String::isNotBlank), vehicle?.let { "${it.optString("registrationNumber")} · ${it.optString("manufacturer")} ${it.optString("model")}" }, vehicle?.optString("status"), display?.optString("name"), display?.optString("state"), duty, dutyRow?.optString("lastLocationAt")?.takeIf(String::isNotBlank)?.let(Instant::parse), dutyRow?.optString("lastEventAt")?.takeIf(String::isNotBlank)?.let(Instant::parse), root.optJSONArray("devices")?.optJSONObject(0)?.optString("notificationState", "UNKNOWN") ?: "UNKNOWN", root.optJSONArray("devices")?.optJSONObject(0)?.optString("locationState", "UNKNOWN") ?: "UNKNOWN", earnings.optString("availableMinor", "0").toLong(), earnings.optString("pendingMinor", "0").toLong(), earnings.optString("settledMinor", "0").toLong(), rides, payouts, root.optJSONArray("beneficiaries")?.optJSONObject(0)?.optString("verificationStatus"), permissions)
    }
    override suspend fun onboardingStatus(): OnboardingStatusSnapshot {
        val root = data(request("/api/driver/onboarding/status", "GET"))
        val documents = (0 until (root.optJSONArray("documents")?.length() ?: 0)).map { index ->
            val row = root.getJSONArray("documents").getJSONObject(index)
            OnboardingDocumentStatus(row.optString("documentType", "UNKNOWN"), row.optString("status", "PENDING"), row.optString("rejectionReason").takeIf(String::isNotBlank))
        }
        val reviews = (0 until (root.optJSONArray("reviews")?.length() ?: 0)).map { index ->
            val row = root.getJSONArray("reviews").getJSONObject(index)
            OnboardingReviewStatus(row.optString("decision", "UNKNOWN"), row.optString("reason").takeIf(String::isNotBlank), Instant.parse(row.getString("createdAt")))
        }
        return OnboardingStatusSnapshot(root.optString("onboardingStatus", "UNKNOWN"), root.optString("accountStatus", "UNKNOWN"), documents, reviews)
    }
    override suspend fun createSupportTicket(category: String, description: String): String = data(request("/api/support/tickets", "POST", JSONObject().put("category", category).put("description", description).toString())).getString("id")
}

class ApiProvider(private val session: SecureTokenProvider) { val api: DriverApi = if (BuildConfig.USE_MOCK_BACKEND) MockDriverApi() else HttpDriverApi(BuildConfig.API_BASE_URL) { session.token() } }
interface SecureTokenProvider { fun token(): String? }
