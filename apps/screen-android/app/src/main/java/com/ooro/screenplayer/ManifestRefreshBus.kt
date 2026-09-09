package com.ooro.screenplayer

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object ManifestRefreshBus {
    private val _events = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val events = _events.asSharedFlow()
    fun request() { _events.tryEmit(Unit) }
}
