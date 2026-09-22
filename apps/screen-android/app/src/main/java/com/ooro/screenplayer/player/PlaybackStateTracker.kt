package com.ooro.screenplayer.player

import com.ooro.screenplayer.model.PlaybackSession

class PlaybackStateTracker {
    var current: PlaybackSession? = null
        private set

    fun start(session: PlaybackSession): Boolean {
        if (current?.itemId == session.itemId) return false
        current = session
        return true
    }

    fun finish(itemId: String): PlaybackSession? {
        val session = current?.takeIf { it.itemId == itemId } ?: return null
        current = null
        return session
    }
}
