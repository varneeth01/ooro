package com.ooro.screenplayer

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ooro.screenplayer.api.*
import com.ooro.screenplayer.data.*
import com.ooro.screenplayer.model.*
import com.ooro.screenplayer.player.AssetManager
import com.ooro.screenplayer.player.ScheduleEngine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import com.ooro.screenplayer.repository.ProofOfPlayRepository
import com.ooro.screenplayer.player.ProofPolicy
import com.ooro.screenplayer.sync.CommandProcessor
import android.util.Log
import com.ooro.screenplayer.location.LocationReporter
import com.ooro.screenplayer.location.LocationSnapshot
import java.time.Instant

sealed interface ScreenState { data object Preparing : ScreenState; data class Setup(val message: String? = null, val repair: Boolean = false) : ScreenState; data class AuthRecovery(val kind: DeviceFailureKind, val message: String, val reconnecting: Boolean = false, val cachedManifest: DeviceManifest? = null) : ScreenState; data class Player(val manifest: DeviceManifest) : ScreenState; data class Admin(val manifest: DeviceManifest?) : ScreenState }
class ScreenViewModel(private val context: Context, private val store: DeviceStore, private val api: DeviceApi, private val db: OoroDatabase, private val assets: AssetManager) : ViewModel() {
    private val _state = MutableStateFlow<ScreenState>(if (store.credentials() == null) ScreenState.Setup() else ScreenState.Preparing)
    val state: StateFlow<ScreenState> = _state
    private val _diagnostic = MutableStateFlow("Not synced yet")
    val diagnostic: StateFlow<String> = _diagnostic
    private val _diagnostics = MutableStateFlow(DiagnosticsState())
    val diagnostics: StateFlow<DiagnosticsState> = _diagnostics
    private val _reconnecting = MutableStateFlow(false)
    val reconnecting: StateFlow<Boolean> = _reconnecting
    private val _pairing = MutableStateFlow(false)
    val pairing: StateFlow<Boolean> = _pairing
    val deviceId get() = store.deviceId
    val isPaired get() = store.credentials() != null
    val screenId get() = store.credentials()?.screenId ?: "—"
    val manifestVersion get() = active?.version?.toString() ?: "—"
    fun refreshLocationPermission() { location.start(); if (location.current() == null) _diagnostic.value = "Location permission required for live screen tracking · playback is unaffected" }
    var online = false; private set
    private var active: DeviceManifest? = null
    private val scheduler = ScheduleEngine(); private val proof = ProofOfPlayRepository(db); private var session: PlaybackSession? = null
    private var playbackPositionMs: Long? = null
    private val location = LocationReporter(context)
    private val _location = MutableStateFlow<LocationSnapshot?>(null)
    val latestLocation: StateFlow<LocationSnapshot?> = _location
    private val _navigation = MutableStateFlow(NavigationState())
    val navigation: StateFlow<NavigationState> = _navigation
    private val _currentCreative = MutableStateFlow<ManifestItem?>(null)
    val currentCreative: StateFlow<ManifestItem?> = _currentCreative
    init { location.start(); viewModelScope.launch { while (true) { val fix = location.current(); _location.value = fix; _navigation.value = _navigation.value.copy(currentLatitude = fix?.latitude, currentLongitude = fix?.longitude, updatedAt = fix?.occurredAt?.let(Instant::ofEpochMilli)); val credentials = store.credentials(); if (credentials != null) { val current = session; runCatching { api.heartbeat(credentials, if (current != null) PlayerStatus.PLAYING else PlayerStatus.READY, db.manifestDao().active()?.version ?: 0, HeartbeatTelemetry(fix, current?.campaignId, current?.creativeId, current?.assetId, current?.let { "PLAYING" } ?: "IDLE", current?.startedAt, if (current != null) playbackPositionMs else null, current?.expectedDurationMs)) }.onFailure { error -> if (error is DeviceApiException) showRecovery(error) }; runCatching { CommandProcessor(context, api, store).poll() }; kotlinx.coroutines.delay(BuildConfig.SYNC_INTERVAL_SECONDS * 1_000L) } else kotlinx.coroutines.delay(90_000) } }; viewModelScope.launch { active = db.manifestDao().active()?.let { ManifestCodec.parse(it.json) }; if (store.credentials() != null) sync(); ManifestRefreshBus.events.collect { sync() } } }
    fun pair(rawCode: String) { if (_pairing.value) return; val code = rawCode.trim().uppercase(); if (code.isBlank()) { _state.value = ScreenState.Setup("Enter a pairing code", true); return }; _pairing.value = true; viewModelScope.launch { try { runCatching { api.health(); val result = api.pair(PairRequest(code,deviceId,android.os.Build.MANUFACTURER,android.os.Build.MODEL,android.os.Build.VERSION.RELEASE,BuildConfig.VERSION_NAME)); store.save(result.credentials); Log.i("OoroScreen", "pairing succeeded displayId=${result.credentials.screenId} tokenPresent=${result.credentials.token.isNotBlank()} paired=true"); sync() }.onFailure { error -> Log.e("OoroScreen", "pairing failed displayId=$deviceId", error); val message = if (error is DeviceApiException) recoveryMessage(error.kind) else "Pairing failed. Check the code and network connection."; _state.value = ScreenState.Setup(message, true) } } finally { _pairing.value = false } } }
    fun reconnect() { if (_reconnecting.value) return; _reconnecting.value = true; val current = (_state.value as? ScreenState.AuthRecovery); if (current != null) _state.value = current.copy(reconnecting = true); viewModelScope.launch { try { sync() } finally { _reconnecting.value = false } } }
    fun beginRepair() { _state.value = ScreenState.Setup("Enter a new pairing code. This keeps the existing screen identity and history.", true) }
    fun sync() { viewModelScope.launch {
        val c = store.credentials() ?: run { Log.w("OoroScreen", "sync skipped tokenPresent=false paired=false"); return@launch }
        Log.w("OoroScreen", "sync started displayId=${c.screenId} tokenPresent=true paired=true")
        _state.value = ScreenState.Preparing

        val health = runCatching { api.health() }
        if (health.isFailure) {
            val error = health.exceptionOrNull()
            if (error is DeviceApiException) showRecovery(error) else _diagnostic.value = "Unable to reach OORO"
            return@launch
        }

        // Report liveness before any manifest or asset network work. A slow or
        // unavailable creative must not make a paired display look offline.
        runCatching {
            Log.w("OoroScreen", "heartbeat sending displayId=${c.screenId} tokenPresent=true paired=true")
            api.heartbeat(c, PlayerStatus.DEGRADED, active?.version ?: db.manifestDao().active()?.version ?: 0)
            Log.w("OoroScreen", "heartbeat accepted displayId=${c.screenId} tokenPresent=true paired=true")
            _diagnostic.value = "Heartbeat accepted · display ${c.screenId}"
        }.onFailure { error ->
            if (error is DeviceApiException) { showRecovery(error); return@onFailure }
            _diagnostic.value = "Heartbeat failed · connection unavailable"
            Log.w("OoroScreen", "heartbeat failed displayId=${c.screenId} tokenPresent=true paired=true", error)
        }

        val manifestResult = runCatching {
            val incoming = api.manifest(c)
            val required = incoming.items.filter { it.url.isNotBlank() }
            val cached = required.mapNotNull { assets.ensure(it) }
            if (cached.size != required.size) error("required assets unavailable")
            db.manifestDao().put(ManifestEntity(version=incoming.version,timezone=incoming.timezone,validUntil=incoming.validUntil?.toString(),json=ManifestCodec.encode(incoming)))
            active=incoming
            assets.cleanup(required.map { it.id }.toSet())
            online=true
            Log.w("OoroScreen", "manifest accepted displayId=${c.screenId} version=${incoming.version} items=${incoming.items.size}")
        }.onFailure { error ->
            online=false
            if (error is DeviceApiException) showRecovery(error) else _diagnostic.value = "Manifest failed · connection unavailable"
            Log.w("OoroScreen", "manifest unavailable; using LKG/fallback displayId=${c.screenId}", error)
        }
        if (_state.value !is ScreenState.AuthRecovery) _state.value = ScreenState.Player(active ?: fallback(c))
        runCatching {
            Log.w("OoroScreen", "heartbeat sending displayId=${c.screenId} tokenPresent=true paired=true")
            api.heartbeat(c, if (manifestResult.isSuccess) PlayerStatus.PLAYING else PlayerStatus.DEGRADED, active?.version ?: 0)
            Log.w("OoroScreen", "heartbeat accepted displayId=${c.screenId} tokenPresent=true paired=true")
            _diagnostic.value = if (manifestResult.isSuccess) "Manifest accepted · heartbeat accepted" else "LKG/fallback active · heartbeat accepted"
        }.onFailure { error ->
            if (error is DeviceApiException) showRecovery(error) else _diagnostic.value = "Heartbeat failed · connection unavailable"
            Log.w("OoroScreen", "heartbeat failed displayId=${c.screenId} tokenPresent=true paired=true", error)
        }
        runCatching { CommandProcessor(context, api, store).poll() }
            .onFailure { error -> Log.w("OoroScreen", "command poll failed displayId=${c.screenId}", error) }
    } }
    private fun showRecovery(error: DeviceApiException) { _diagnostic.value = recoveryMessage(error.kind); _state.value = ScreenState.AuthRecovery(error.kind, recoveryMessage(error.kind), cachedManifest = active) }
    private fun recoveryMessage(kind: DeviceFailureKind): String = when (kind) {
        DeviceFailureKind.DNS_ERROR, DeviceFailureKind.CONNECTION_REFUSED, DeviceFailureKind.TIMEOUT, DeviceFailureKind.TLS_ERROR, DeviceFailureKind.NETWORK_UNAVAILABLE -> "Unable to reach OORO. Check the network connection and try again."
        DeviceFailureKind.AUTH_EXPIRED -> "Device session expired. Reconnect to request a fresh session."
        DeviceFailureKind.AUTH_INVALID, DeviceFailureKind.AUTH_REVOKED -> "Device authentication needs to be repaired."
        DeviceFailureKind.DEVICE_NOT_FOUND -> "This device is no longer registered with OORO."
        DeviceFailureKind.PAIRING_REQUIRED -> "This device needs to be paired again."
        DeviceFailureKind.SERVER_UNAVAILABLE -> "OORO is temporarily unavailable. Please try again."
        DeviceFailureKind.REQUEST_FAILED -> "We couldn't connect this screen to OORO. Please try again."
    }
    fun currentItem(manifest: DeviceManifest): ManifestItem? = scheduler.next(manifest)
    /** The renderer and offer panel use the same manifest item for every frame. */
    fun activatePresentation(item: ManifestItem) { if (_currentCreative.value?.id != item.id) _currentCreative.value = item }
    fun creativeStarted(item: ManifestItem) { if (session?.itemId == item.id) return; session = PlaybackSession(java.util.UUID.randomUUID().toString(), item.id, item.campaignId, item.creativeId, item.assetId, Instant.now(), item.durationSeconds * 1000L); _currentCreative.value = item; playbackPositionMs = 0; reportPlayback(item, "PLAYING") }
    fun creativePosition(item: ManifestItem, positionMs: Long) { if (session?.itemId == item.id) playbackPositionMs = positionMs.coerceAtLeast(0) }
    fun creativeFinished(item: ManifestItem, actualMs: Long, success: Boolean, reason: String? = null) { val s = session ?: return; if (s.itemId != item.id) return; session = null; val accepted = success && (item.type != CreativeType.VIDEO || ProofPolicy().videoSuccess(s.expectedDurationMs, actualMs)); reportPlayback(item, if (accepted) "IDLE" else "FAILED", actualMs); playbackPositionMs = null; _currentCreative.value = item; viewModelScope.launch { proof.record(ProofOfPlay(eventId = s.eventId, screenId = store.credentials()?.screenId ?: "", deviceId = deviceId, campaignId = s.campaignId, creativeId = s.creativeId, scheduleItemId = s.itemId, startedAt = s.startedAt, endedAt = Instant.now(), expectedDurationMs = s.expectedDurationMs, actualPlayedMs = actualMs, success = accepted, failureReason = reason ?: if (!accepted) "PLAYBACK_BELOW_COMPLETION_POLICY" else null, appVersion = BuildConfig.VERSION_NAME, assetId = s.assetId)) } }
    fun setNavigationState(state: NavigationState) { _navigation.value = state.copy(currentLatitude = _location.value?.latitude, currentLongitude = _location.value?.longitude) }
    private fun reportPlayback(item: ManifestItem, state: String, positionMs: Long? = null) { viewModelScope.launch { store.credentials()?.let { credentials -> runCatching { api.heartbeat(credentials, if (state == "PLAYING") PlayerStatus.PLAYING else if (state == "FAILED") PlayerStatus.ERROR else PlayerStatus.READY, db.manifestDao().active()?.version ?: 0, HeartbeatTelemetry(location.current(), item.campaignId, item.creativeId, item.assetId, state, session?.startedAt, positionMs, item.durationSeconds * 1000L)) } } } }
    suspend fun localFile(item: ManifestItem): String? = assets.ensure(item)?.absolutePath
    fun showAdmin() { _state.value = ScreenState.Admin(active); runDiagnostics() }
    fun closeAdmin() {
        val credentials = store.credentials()
        _state.value = when {
            active != null -> ScreenState.Player(active!!)
            credentials != null -> ScreenState.Player(fallback(credentials))
            else -> ScreenState.Setup()
        }
    }
    fun unpair() { viewModelScope.launch { store.credentials()?.let { runCatching { api.unpair(it) } }; store.clear(); active=null; _state.value=ScreenState.Setup("Screen unpaired") } }
    fun runDiagnostics() { viewModelScope.launch {
        _diagnostics.value = _diagnostics.value.copy(running = true, message = "Running network and device checks…")
        val probe = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { probeApi(BuildConfig.API_BASE_URL) }
        var result = _diagnostics.value.copy(running = false, probe = probe, message = null)
        result = if (probe.connected) result.copy(apiLastSuccessAt = System.currentTimeMillis(), apiLastError = null) else result.copy(apiLastError = probe.error ?: "Could not connect to host")
        val credentials = store.credentials()
        result = result.copy(heartbeatLastAttemptAt = System.currentTimeMillis())
        if (credentials != null && probe.connected) {
            runCatching { api.heartbeat(credentials, PlayerStatus.DEGRADED, active?.version ?: db.manifestDao().active()?.version ?: 0, HeartbeatTelemetry(location.current())) }
                .onSuccess { result = result.copy(heartbeatLastSuccessAt = System.currentTimeMillis(), heartbeatStatus = probe.httpStatus, heartbeatError = null) }
                .onFailure { error -> result = result.copy(heartbeatStatus = Regex("HTTP\\s+(\\d{3})").find(error.message.orEmpty())?.groupValues?.getOrNull(1)?.toIntOrNull(), heartbeatError = sanitizeDiagnosticError(error.message)) }
        } else if (credentials == null) result = result.copy(heartbeatError = "Device is not paired")
        val stored = db.manifestDao().active()
        val manifest = active ?: stored?.let { runCatching { ManifestCodec.parse(it.json) }.getOrNull() }
        val counts = manifest?.let { assets.verify(it.items) } ?: (0 to 0)
        val queued = db.proofDao().pendingCount()
        _diagnostics.value = result.copy(manifestLastSyncAt = stored?.let { System.currentTimeMillis() }, manifestLastAttemptAt = System.currentTimeMillis(), manifestError = if (manifest == null) "No cached manifest" else null, verifiedAssets = counts.first, missingAssets = counts.second, proofQueued = queued, lastDiagnosis = diagnose(probe, credentials != null, result.heartbeatStatus, result.heartbeatError, manifest, counts.second, queued))
    } }
    private fun diagnose(probe: ApiProbe, paired: Boolean, heartbeatStatus: Int?, heartbeatError: String?, manifest: DeviceManifest?, missingAssets: Int, queued: Int): String = when {
        !probe.connected && probe.failureKind == "DNS_ERROR" -> "DNS_ERROR · API host could not be resolved"
        !probe.connected && probe.failureKind == "CONNECTION_REFUSED" -> "CONNECTION_REFUSED · API is not reachable on port 8080"
        !probe.connected && probe.failureKind == "TIMEOUT" -> "TIMEOUT · API did not respond"
        !probe.connected && probe.failureKind == "TLS_ERROR" -> "TLS_ERROR · secure connection failed"
        !probe.connected && BuildConfig.API_BASE_URL.startsWith("http://") -> "Development server IP may have changed or port 8080 is unreachable"
        !probe.connected -> "OORO server cannot be reached"
        paired && heartbeatStatus == 401 -> "Device authentication expired or invalid"
        paired && heartbeatStatus != null && heartbeatStatus >= 500 -> "OORO server error"
        location.current() == null -> "Waiting for GPS signal"
        manifest != null && missingAssets > 0 -> "Creative download failed"
        queued > 0 && !probe.connected -> "Proofs waiting for connection"
        else -> "No blocking issue detected"
    }
    fun diagnosticReport(): String { val d = _diagnostics.value; val n = networkInfo(context); val l = locationDiagnostics(context); val c = store.credentials(); return buildString {
        appendLine("OORO DIAGNOSTIC"); appendLine("Screen ID       ${c?.screenId ?: "UNPAIRED"}"); appendLine("Device ID       $deviceId"); appendLine("App version     ${BuildConfig.VERSION_NAME}"); appendLine("Android         ${android.os.Build.VERSION.RELEASE}"); appendLine("Device model    ${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"); appendLine("API host        ${BuildConfig.API_BASE_URL}"); appendLine("Environment     ${if (BuildConfig.DEBUG) "DEBUG" else "PRODUCTION"}"); appendLine("Mock backend    ${if (BuildConfig.USE_MOCK_BACKEND) "ON" else "OFF"}"); appendLine("Network         ${n.type}"); appendLine("Device IP       ${n.ip ?: "unavailable"}"); appendLine("API             ${if (d.probe?.connected == true) "CONNECTED" else "UNREACHABLE"}"); appendLine("Pairing         ${if (c != null) "PAIRED" else "UNPAIRED"}"); appendLine("GPS             ${if (l.permission && (l.gps || l.network)) "AVAILABLE" else "UNAVAILABLE"}"); appendLine("Manifest        ${if (d.manifestLastSyncAt != null) "CACHED" else "UNKNOWN"}"); appendLine("Assets          ${d.verifiedAssets} verified, ${d.missingAssets} missing"); appendLine("Proof queue     ${d.proofQueued} waiting"); appendLine("Primary issue   ${d.lastDiagnosis ?: "Not run"}")
    } }
    fun retryQueue() { val request = androidx.work.OneTimeWorkRequestBuilder<com.ooro.screenplayer.sync.SyncWorker>().build(); androidx.work.WorkManager.getInstance(context).enqueueUniqueWork("ooro-diagnostic-retry", androidx.work.ExistingWorkPolicy.REPLACE, request) }
    private fun fallback(c: DeviceCredentials) = DeviceManifest(0,c.screenId,BuildConfig.DEFAULT_TIMEZONE,emptyList(),null)
    override fun onCleared() { location.stop(); super.onCleared() }
    companion object { fun factory(context: Context) = object: ViewModelProvider.Factory { override fun <T:ViewModel> create(type:Class<T>):T = ScreenViewModel(context,DeviceStore(context),ApiProvider(DeviceStore(context)).api,OoroDatabase.get(context),AssetManager(context)) as T } }
}
