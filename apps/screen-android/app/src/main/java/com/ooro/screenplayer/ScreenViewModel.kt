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

sealed interface ScreenState { data object Preparing : ScreenState; data class Setup(val message: String? = null) : ScreenState; data class Player(val manifest: DeviceManifest) : ScreenState; data class Admin(val manifest: DeviceManifest?) : ScreenState }
class ScreenViewModel(private val store: DeviceStore, private val api: DeviceApi, private val db: OoroDatabase, private val assets: AssetManager) : ViewModel() {
    private val _state = MutableStateFlow<ScreenState>(if (store.credentials() == null) ScreenState.Setup() else ScreenState.Preparing)
    val state: StateFlow<ScreenState> = _state
    val deviceId get() = store.deviceId
    var online = false; private set
    private var active: DeviceManifest? = null
    private val scheduler = ScheduleEngine(); private val proof = ProofOfPlayRepository(db); private var session: PlaybackSession? = null
    init { viewModelScope.launch { active = db.manifestDao().active()?.let { ManifestCodec.parse(it.json) }; if (store.credentials() != null) sync() } }
    fun pair(rawCode: String) { val code = rawCode.trim().uppercase(); if (code.isBlank()) return; viewModelScope.launch { runCatching { if (BuildConfig.ALLOW_DEMO_PAIRING && code.removePrefix("OORO-") == "DEMO") api.pair(PairRequest(code,deviceId,android.os.Build.MANUFACTURER,android.os.Build.MODEL,android.os.Build.VERSION.RELEASE,BuildConfig.VERSION_NAME)) else api.pair(PairRequest(code,deviceId,android.os.Build.MANUFACTURER,android.os.Build.MODEL,android.os.Build.VERSION.RELEASE,BuildConfig.VERSION_NAME)) }.onSuccess { store.save(it.credentials); sync() }.onFailure { _state.value = ScreenState.Setup("Pairing failed. Check the code and network connection.") } } }
    fun sync() { viewModelScope.launch { val c = store.credentials() ?: return@launch; _state.value = ScreenState.Preparing; runCatching { val incoming = api.manifest(c); val required = incoming.items.filter { it.url.isNotBlank() }; val cached = required.mapNotNull { assets.ensure(it) }; if (cached.size == required.size) { db.manifestDao().put(ManifestEntity(version=incoming.version,timezone=incoming.timezone,validUntil=incoming.validUntil?.toString(),json=ManifestCodec.encode(incoming))); active=incoming; assets.cleanup(required.map { it.id }.toSet()); online=true } else error("required assets unavailable") }.onSuccess { _state.value=ScreenState.Player(active ?: fallback(c)); api.heartbeat(c,PlayerStatus.PLAYING,active?.version ?: 0) }.onFailure { online=false; _state.value=ScreenState.Player(active ?: fallback(c)) } } }
    fun currentItem(manifest: DeviceManifest): ManifestItem? = scheduler.next(manifest)
    fun creativeStarted(item: ManifestItem) { if (session?.assetId == item.id) return; session = PlaybackSession(java.util.UUID.randomUUID().toString(), item.campaignId, item.creativeId, item.id, Instant.now(), item.durationSeconds * 1000L) }
    fun creativeFinished(item: ManifestItem, actualMs: Long, success: Boolean, reason: String? = null) { val s = session ?: return; if (s.assetId != item.id) return; session = null; val accepted = success && (item.type != CreativeType.VIDEO || ProofPolicy().videoSuccess(s.expectedDurationMs, actualMs)); viewModelScope.launch { proof.record(ProofOfPlay(s.eventId, store.credentials()?.screenId ?: "", deviceId, s.campaignId, s.creativeId, s.assetId, s.startedAt, Instant.now(), s.expectedDurationMs, actualMs, accepted, reason ?: if (!accepted) "PLAYBACK_BELOW_COMPLETION_POLICY" else null, BuildConfig.VERSION_NAME)) } }
    suspend fun localFile(item: ManifestItem): String? = assets.ensure(item)?.absolutePath
    fun showAdmin() { _state.value = ScreenState.Admin(active) }
    fun closeAdmin() { _state.value = ScreenState.Player(active ?: fallback(store.credentials() ?: return)) }
    fun unpair() { viewModelScope.launch { store.credentials()?.let { runCatching { api.unpair(it) } }; store.clear(); active=null; _state.value=ScreenState.Setup("Screen unpaired") } }
    private fun fallback(c: DeviceCredentials) = DeviceManifest(0,c.screenId,BuildConfig.DEFAULT_TIMEZONE,emptyList(),null)
    companion object { fun factory(context: Context) = object: ViewModelProvider.Factory { override fun <T:ViewModel> create(type:Class<T>):T = ScreenViewModel(DeviceStore(context),ApiProvider(DeviceStore(context)).api,OoroDatabase.get(context),AssetManager(context)) as T } }
}
