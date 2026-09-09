package com.ooro.screenplayer.sync

import android.content.Context
import com.ooro.screenplayer.api.*
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.ManifestRefreshBus
import com.ooro.screenplayer.data.ManifestEntity
import com.ooro.screenplayer.data.OoroDatabase
import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.player.AssetManager
import java.time.Instant

class CommandProcessor(private val context: Context, private val api: DeviceApi, private val store: DeviceStore) {
    private val prefs = context.getSharedPreferences("ooro_commands", Context.MODE_PRIVATE)
    suspend fun poll() { val credentials = store.credentials() ?: return; api.pendingCommands(credentials).forEach { command -> if (prefs.getBoolean(command.id, false)) return@forEach; val received = Instant.now(); val started = Instant.now(); val result = runCatching { execute(command, credentials); CommandResult(command.id, credentials.deviceId, "SUCCEEDED", received, started, Instant.now()) }.getOrElse { error -> val unsupported = error is UnsupportedOperationException; CommandResult(command.id, credentials.deviceId, if (unsupported) "UNSUPPORTED" else "FAILED", received, started, Instant.now(), if (unsupported) "UNSUPPORTED_COMMAND" else "COMMAND_FAILED", error.message) }; runCatching { api.acknowledgeCommand(credentials, result) }.onSuccess { prefs.edit().putBoolean(command.id, true).apply() } } }
    private suspend fun execute(command: DeviceCommand, credentials: com.ooro.screenplayer.model.DeviceCredentials) { when (command.type.uppercase()) { "REFRESH_MANIFEST", "SYNC_MANIFEST" -> refreshManifest(credentials); "HEALTH_CHECK", "WAKE", "SLEEP", "START_SESSION", "STOP_SESSION" -> Unit; "RESTART_PLAYER", "RESTART_APP" -> { context.packageManager.getLaunchIntentForPackage(context.packageName)?.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP)?.let(context::startActivity) }; "CLEAR_CACHE", "CLEAR_UNUSED_CACHE" -> context.cacheDir.listFiles()?.forEach { it.delete() }; "UNPAIR" -> store.clear(); else -> throw UnsupportedOperationException("Unsupported command: ${command.type}") } }
    private suspend fun refreshManifest(credentials: com.ooro.screenplayer.model.DeviceCredentials) { val db = OoroDatabase.get(context); val assets = AssetManager(context); val manifest = api.manifest(credentials); val required = manifest.items.filter { it.url.isNotBlank() }; val cached = required.mapNotNull { assets.ensure(it) }; if (cached.size != required.size) error("manifest assets unavailable"); db.manifestDao().put(ManifestEntity(version = manifest.version, timezone = manifest.timezone, validUntil = manifest.validUntil?.toString(), json = ManifestCodec.encode(manifest))); ManifestRefreshBus.request() }
}
