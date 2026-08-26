package com.ooro.screenplayer

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ooro.screenplayer.api.*
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID

sealed interface ScreenState { data class Setup(val message: String? = null) : ScreenState; data object Preparing : ScreenState; data class Player(val manifest: DeviceManifest) : ScreenState }
class ScreenViewModel(private val store: DeviceStore, private val api: DeviceApi) : ViewModel() {
    private val _state = MutableStateFlow<ScreenState>(if (store.credentials() == null) ScreenState.Setup() else ScreenState.Preparing); val state: StateFlow<ScreenState> = _state
    val deviceId get() = store.deviceId; var online = true; var adminTaps = 0
    private var manifest: DeviceManifest? = null
    init { if (store.credentials() != null) sync() }
    fun pair(rawCode: String) { val code = rawCode.trim().uppercase(); if (code.isBlank()) return; viewModelScope.launch { if (BuildConfig.ALLOW_DEMO_PAIRING && code.removePrefix("OORO-") == "DEMO") { val response = api.pair(PairRequest(code, deviceId, android.os.Build.MANUFACTURER, android.os.Build.MODEL, android.os.Build.VERSION.RELEASE, BuildConfig.VERSION_NAME)); store.save(response.credentials); sync() } else _state.value = ScreenState.Setup("Code not recognised. Use OORO-DEMO in debug mode.") } }
    private fun sync() { viewModelScope.launch { val credentials = store.credentials() ?: return@launch; _state.value = ScreenState.Preparing; runCatching { api.manifest(credentials) }.onSuccess { manifest = it; _state.value = ScreenState.Player(it); api.heartbeat(credentials, PlayerStatus.PLAYING, it.version) }.onFailure { _state.value = ScreenState.Player(manifest ?: demoManifest(credentials)) } } }
    fun currentItem(manifest: DeviceManifest): ManifestItem? = manifest.items.filter { it.isActive(Instant.now(), java.time.ZoneId.of(manifest.timezone)) }.sortedWith(compareByDescending<ManifestItem> { it.priority }.thenBy { it.id }).firstOrNull()
    fun showAdmin() { _state.value = ScreenState.Setup("Installer diagnostics are available in the admin build.") }
    private fun demoManifest(c: DeviceCredentials) = DeviceManifest(1, c.screenId, BuildConfig.DEFAULT_TIMEZONE, listOf(ManifestItem(UUID.randomUUID().toString(), "fallback", "fallback", CreativeType.IMAGE, "", null, 8, 0, null, null, emptySet(), null, null)), null)
    companion object { fun factory(context: Context) = object : ViewModelProvider.Factory { override fun <T : ViewModel> create(modelClass: Class<T>): T = ScreenViewModel(DeviceStore(context), ApiProvider(DeviceStore(context)).api) as T } }
}
