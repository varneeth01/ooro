@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)

package com.ooro.screenplayer.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.core.net.toUri
import java.io.File
import android.util.Log
import com.ooro.screenplayer.RuntimeDiagnostics

/** Media3 boundary. Playback remains local: callers pass a verified cached file URI. */
class Media3CreativePlayer(context: Context, private val onStarted: () -> Unit = {}, private val onCompleted: (Long) -> Unit = {}, private val onFailed: (Throwable) -> Unit = {}, private val onStall: () -> Unit = {}, private val onPosition: (Long) -> Unit = {}, private val onVideoSize: (androidx.media3.common.VideoSize) -> Unit = {}, repeatOne: Boolean = false) : AutoCloseable {
    val player: ExoPlayer = ExoPlayer.Builder(context).build().apply { volume = 0f; repeatMode = if (repeatOne) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF }
    private val watchdog = android.os.Handler(android.os.Looper.getMainLooper()); private var lastPosition = -1L; private var stallCount = 0; private var closed = false
    init {
        RuntimeDiagnostics.playerCreated()
        player.addListener(object : androidx.media3.common.Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (isPlaying) { onStarted(); scheduleWatchdog() }
                else watchdog.removeCallbacks(watchdogTick)
            }
            override fun onPlaybackStateChanged(state: Int) {
                if (state == androidx.media3.common.Player.STATE_ENDED) onCompleted(player.duration.coerceAtLeast(player.currentPosition))
            }
            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                watchdog.removeCallbacks(watchdogTick)
                onFailed(error)
            }
            override fun onVideoSizeChanged(videoSize: androidx.media3.common.VideoSize) {
                Log.i("OoroScreen", "video size width=${videoSize.width} height=${videoSize.height} rotation=${videoSize.unappliedRotationDegrees} pixelRatio=${videoSize.pixelWidthHeightRatio}")
                onVideoSize(videoSize)
            }
        })
        player.addAnalyticsListener(object : AnalyticsListener {
            override fun onVideoDecoderInitialized(eventTime: AnalyticsListener.EventTime, decoderName: String, initializedTimestampMs: Long, initializationDurationMs: Long) {
                RuntimeDiagnostics.decoderInitialized()
                Log.i("OoroScreen", "video decoder initialized name=$decoderName initMs=$initializationDurationMs")
            }

            override fun onVideoDecoderReleased(eventTime: AnalyticsListener.EventTime, decoderName: String) {
                RuntimeDiagnostics.decoderReleased()
            }
        })
    }
    fun play(localPath: String) {
        if (closed) return
        watchdog.removeCallbacks(watchdogTick)
        lastPosition = -1L
        stallCount = 0
        Log.i("OoroScreen", "media playback prepared file=${File(localPath).name}")
        player.setMediaItem(MediaItem.fromUri(File(localPath).toUri()))
        player.prepare()
        player.play()
    }
    private fun scheduleWatchdog() {
        watchdog.removeCallbacks(watchdogTick)
        if (!closed && player.isPlaying) watchdog.postDelayed(watchdogTick, 10_000)
    }
    private val watchdogTick = object : Runnable {
        override fun run() {
            if (closed || !player.isPlaying) return
            val position = player.currentPosition
            RuntimeDiagnostics.increment(RuntimeDiagnostics.Counter.POSITION_SAMPLE)
            onPosition(position)
            if (position == lastPosition) {
                stallCount++
                if (stallCount >= 2) { stallCount = 0; recover(); onStall() }
            } else { lastPosition = position; stallCount = 0 }
            scheduleWatchdog()
        }
    }
    fun recover() { player.seekTo(0); player.prepare(); player.play() }
    override fun close() { if (closed) return; closed = true; watchdog.removeCallbacks(watchdogTick); player.release(); RuntimeDiagnostics.playerReleased(); Log.i("OoroScreen", "media playback released") }
}
