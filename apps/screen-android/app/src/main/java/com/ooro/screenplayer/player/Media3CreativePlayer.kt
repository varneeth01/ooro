package com.ooro.screenplayer.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.core.net.toUri
import java.io.File

/** Media3 boundary. Playback remains local: callers pass a verified cached file URI. */
class Media3CreativePlayer(context: Context, private val onStarted: () -> Unit = {}, private val onCompleted: (Long) -> Unit = {}, private val onFailed: (Throwable) -> Unit = {}, private val onStall: () -> Unit = {}) : AutoCloseable {
    val player: ExoPlayer = ExoPlayer.Builder(context).build().apply { volume = 0f; repeatMode = ExoPlayer.REPEAT_MODE_OFF }
    private val watchdog = android.os.Handler(android.os.Looper.getMainLooper()); private var lastPosition = -1L; private var stallCount = 0
    init { player.addListener(object : androidx.media3.common.Player.Listener { override fun onIsPlayingChanged(isPlaying: Boolean) { if (isPlaying) onStarted() }; override fun onPlaybackStateChanged(state: Int) { if (state == androidx.media3.common.Player.STATE_ENDED) onCompleted(player.duration.coerceAtLeast(player.currentPosition)); }; override fun onPlayerError(error: androidx.media3.common.PlaybackException) { onFailed(error) } }) }
    fun play(localPath: String) { player.setMediaItem(MediaItem.fromUri(File(localPath).toUri())); player.prepare(); player.play(); watchdog.post(watchdogTick) }
    private val watchdogTick = object : Runnable { override fun run() { if (player.isPlaying) { val position = player.currentPosition; if (position == lastPosition) { stallCount++; if (stallCount >= 2) { stallCount = 0; recover(); onStall() } } else { lastPosition = position; stallCount = 0 } }; watchdog.postDelayed(this, 10_000) } }
    fun recover() { player.seekTo(0); player.prepare(); player.play() }
    override fun close() { watchdog.removeCallbacks(watchdogTick); player.release() }
}
