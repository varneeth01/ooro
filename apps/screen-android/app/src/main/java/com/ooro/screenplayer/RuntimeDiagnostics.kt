package com.ooro.screenplayer

import java.util.concurrent.atomic.AtomicLongArray
import java.util.concurrent.atomic.AtomicBoolean

/** Bounded, opt-in counters. Release builds compile recording calls to no-ops. */
object RuntimeDiagnostics {
    enum class Counter {
        ROOT_COMPOSITION, TICKER_COMPOSITION, AD_COMPOSITION, MAP_COMPOSITION, OFFER_COMPOSITION,
        PLAYER_CREATED, PLAYER_RELEASED, DECODER_INITIALIZED, DECODER_RELEASED,
        IMAGE_DECODE, IMAGE_DECODED_BYTES, QR_DECODE, QR_DECODED_BYTES,
        MAPVIEW_CREATED, MAPVIEW_RELEASED,
        WORKER_RUN, HEARTBEAT_REQUEST, MANIFEST_REQUEST, COMMAND_POLL, POSITION_SAMPLE
    }

    private val values = AtomicLongArray(Counter.entries.size)
    private val activePlayers = AtomicLongArray(1)
    private val activeMaps = AtomicLongArray(1)
    private val activeDecoders = AtomicLongArray(1)
    private val enabled = AtomicBoolean(false)

    fun enable() {
        if (BuildConfig.DEBUG) {
            enabled.set(false)
            Counter.entries.forEach { values.set(it.ordinal, 0) }
            activePlayers.set(0, 0)
            activeMaps.set(0, 0)
            activeDecoders.set(0, 0)
            enabled.set(true)
        }
    }

    fun disable() {
        enabled.set(false)
    }

    fun increment(counter: Counter, amount: Long = 1) {
        if (BuildConfig.DEBUG && enabled.get()) values.addAndGet(counter.ordinal, amount)
    }

    fun playerCreated() {
        if (BuildConfig.DEBUG && enabled.get()) {
            increment(Counter.PLAYER_CREATED)
            activePlayers.incrementAndGet(0)
        }
    }

    fun playerReleased() {
        if (BuildConfig.DEBUG && enabled.get()) {
            increment(Counter.PLAYER_RELEASED)
            activePlayers.updateAndGet(0) { current -> (current - 1).coerceAtLeast(0) }
        }
    }

    fun mapCreated() {
        if (BuildConfig.DEBUG && enabled.get()) {
            increment(Counter.MAPVIEW_CREATED)
            activeMaps.incrementAndGet(0)
        }
    }

    fun mapReleased() {
        if (BuildConfig.DEBUG && enabled.get()) {
            increment(Counter.MAPVIEW_RELEASED)
            activeMaps.updateAndGet(0) { current -> (current - 1).coerceAtLeast(0) }
        }
    }

    fun decoderInitialized() {
        if (BuildConfig.DEBUG && enabled.get()) {
            increment(Counter.DECODER_INITIALIZED)
            activeDecoders.incrementAndGet(0)
        }
    }

    fun decoderReleased() {
        if (BuildConfig.DEBUG && enabled.get()) {
            increment(Counter.DECODER_RELEASED)
            activeDecoders.updateAndGet(0) { current -> (current - 1).coerceAtLeast(0) }
        }
    }

    fun capture(): LongArray = LongArray(Counter.entries.size) { values.get(it) }

    fun formatDelta(before: LongArray): String {
        if (!BuildConfig.DEBUG) return "disabled"
        return buildString {
            Counter.entries.forEach { append(it.name).append('=').append(values.get(it.ordinal) - before[it.ordinal]).append(' ') }
            append("WINDOW_PLAYER_BALANCE=").append(activePlayers.get(0)).append(' ')
            append("WINDOW_MAPVIEW_BALANCE=").append(activeMaps.get(0))
            append(" WINDOW_DECODER_BALANCE=").append(activeDecoders.get(0))
        }
    }
}
