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
import java.time.Instant
import com.ooro.screenplayer.repository.ProofOfPlayRepository
import com.ooro.screenplayer.player.ProofPolicy
import com.ooro.screenplayer.sync.CommandProcessor
import android.util.Log

sealed interface ScreenState { data object Preparing : ScreenState; data class Setup(val message: String? = null) : ScreenState; data class Player(val manifest: DeviceManifest) : ScreenState; data class Admin(val manifest: DeviceManifest?) : ScreenState }
class ScreenViewModel(private val context: Context, private val store: DeviceStore, private val api: DeviceApi, private val db: OoroDatabase, private val assets: AssetManager) : ViewModel() {
    private val _state = MutableStateFlow<ScreenState>(if (store.credentials() == null) ScreenState.Setup() else ScreenState.Preparing)
    val state: StateFlow<ScreenState> = _state
    private val _diagnostic = MutableStateFlow("Not synced yet")
    val diagnostic: StateFlow<String> = _diagnostic
    val deviceId get() = store.deviceId
    var online = false; private set
    private var active: DeviceManifest? = null
    private val scheduler = ScheduleEngine(); private val proof = ProofOfPlayRepository(db); private var session: PlaybackSession? = null
    init { viewModelScope.launch { active = db.manifestDao().active()?.let { ManifestCodec.parse(it.json) }; if (store.credentials() != null) sync(); ManifestRefreshBus.events.collect { sync() } } }
    fun pair(rawCode: String) { val code = rawCode.trim().uppercase(); if (code.isBlank()) { _state.value = ScreenState.Setup("Enter a pairing code"); return }; viewModelScope.launch { runCatching { val result = api.pair(PairRequest(code,deviceId,android.os.Build.MANUFACTURER,android.os.Build.MODEL,android.os.Build.VERSION.RELEASE,BuildConfig.VERSION_NAME)); store.save(result.credentials); Log.i("OoroScreen", "pairing succeeded displayId=${result.credentials.screenId} tokenPresent=${result.credentials.token.isNotBlank()} paired=true"); sync() }.onFailure { error -> Log.e("OoroScreen", "pairing failed displayId=$deviceId", error); _state.value = ScreenState.Setup("Pairing failed. Check the code and network connection.") } } }
    fun sync() { viewModelScope.launch {
        val c = store.credentials() ?: run { Log.w("OoroScreen", "sync skipped tokenPresent=false paired=false"); return@launch }
        Log.w("OoroScreen", "sync started displayId=${c.screenId} tokenPresent=true paired=true")
        _state.value = ScreenState.Preparing

        // Report liveness before any manifest or asset network work. A slow or
        // unavailable creative must not make a paired display look offline.
        runCatching {
            Log.w("OoroScreen", "heartbeat sending displayId=${c.screenId} tokenPresent=true paired=true")
            api.heartbeat(c, PlayerStatus.DEGRADED, active?.version ?: db.manifestDao().active()?.version ?: 0)
            Log.w("OoroScreen", "heartbeat accepted displayId=${c.screenId} tokenPresent=true paired=true")
            _diagnostic.value = "Heartbeat accepted · display ${c.screenId}"
        }.onFailure { error ->
            _diagnostic.value = "Heartbeat failed · ${error.message ?: error.javaClass.simpleName}"
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
            _diagnostic.value = "Manifest failed · ${error.message ?: error.javaClass.simpleName}"
            Log.w("OoroScreen", "manifest unavailable; using LKG/fallback displayId=${c.screenId}", error)
        }
        _state.value = ScreenState.Player(active ?: fallback(c))
        runCatching {
            Log.w("OoroScreen", "heartbeat sending displayId=${c.screenId} tokenPresent=true paired=true")
            api.heartbeat(c, if (manifestResult.isSuccess) PlayerStatus.PLAYING else PlayerStatus.DEGRADED, active?.version ?: 0)
            Log.w("OoroScreen", "heartbeat accepted displayId=${c.screenId} tokenPresent=true paired=true")
            _diagnostic.value = if (manifestResult.isSuccess) "Manifest accepted · heartbeat accepted" else "LKG/fallback active · heartbeat accepted"
        }.onFailure { error ->
            _diagnostic.value = "Heartbeat failed · ${error.message ?: error.javaClass.simpleName}"
            Log.w("OoroScreen", "heartbeat failed displayId=${c.screenId} tokenPresent=true paired=true", error)
        }
        runCatching { CommandProcessor(context, api, store).poll() }
            .onFailure { error -> Log.w("OoroScreen", "command poll failed displayId=${c.screenId}", error) }
    } }
    fun currentItem(manifest: DeviceManifest): ManifestItem? = scheduler.next(manifest)
    fun creativeStarted(item: ManifestItem) { if (session?.assetId == item.id) return; session = PlaybackSession(java.util.UUID.randomUUID().toString(), item.campaignId, item.creativeId, item.id, Instant.now(), item.durationSeconds * 1000L) }
    fun creativeFinished(item: ManifestItem, actualMs: Long, success: Boolean, reason: String? = null) { val s = session ?: return; if (s.assetId != item.id) return; session = null; val accepted = success && (item.type != CreativeType.VIDEO || ProofPolicy().videoSuccess(s.expectedDurationMs, actualMs)); viewModelScope.launch { proof.record(ProofOfPlay(s.eventId, store.credentials()?.screenId ?: "", deviceId, s.campaignId, s.creativeId, s.assetId, s.startedAt, Instant.now(), s.expectedDurationMs, actualMs, accepted, reason ?: if (!accepted) "PLAYBACK_BELOW_COMPLETION_POLICY" else null, BuildConfig.VERSION_NAME)) } }
    suspend fun localFile(item: ManifestItem): String? = assets.ensure(item)?.absolutePath
    fun showAdmin() { _state.value = ScreenState.Admin(active) }
    fun closeAdmin() { _state.value = ScreenState.Player(active ?: fallback(store.credentials() ?: return)) }
    fun unpair() { viewModelScope.launch { store.credentials()?.let { runCatching { api.unpair(it) } }; store.clear(); active=null; _state.value=ScreenState.Setup("Screen unpaired") } }
    private fun fallback(c: DeviceCredentials) = DeviceManifest(0,c.screenId,BuildConfig.DEFAULT_TIMEZONE,emptyList(),null)
    companion object { fun factory(context: Context) = object: ViewModelProvider.Factory { override fun <T:ViewModel> create(type:Class<T>):T = ScreenViewModel(context,DeviceStore(context),ApiProvider(DeviceStore(context)).api,OoroDatabase.get(context),AssetManager(context)) as T } }
}
