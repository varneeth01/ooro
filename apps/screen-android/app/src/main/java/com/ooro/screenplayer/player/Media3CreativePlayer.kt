package com.ooro.screenplayer.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

/** Media3 boundary. Playback remains local: callers pass a verified cached file URI. */
class Media3CreativePlayer(context: Context) : AutoCloseable {
    val player: ExoPlayer = ExoPlayer.Builder(context).build().apply { volume = 0f; repeatMode = ExoPlayer.REPEAT_MODE_OFF }
    fun play(localPath: String) { player.setMediaItem(MediaItem.fromUri(localPath)); player.prepare(); player.play() }
    override fun close() { player.release() }
}
