package com.ooro.screenplayer

import java.util.concurrent.atomic.AtomicLongArray

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

    fun increment(counter: Counter, amount: Long = 1) {
        if (BuildConfig.DEBUG) values.addAndGet(counter.ordinal, amount)
    }

    fun playerCreated() {
        if (BuildConfig.DEBUG) {
            increment(Counter.PLAYER_CREATED)
            activePlayers.incrementAndGet(0)
        }
    }

    fun playerReleased() {
        if (BuildConfig.DEBUG) {
            increment(Counter.PLAYER_RELEASED)
            activePlayers.updateAndGet(0) { current -> (current - 1).coerceAtLeast(0) }
        }
    }

    fun mapCreated() {
        if (BuildConfig.DEBUG) {
            increment(Counter.MAPVIEW_CREATED)
            activeMaps.incrementAndGet(0)
        }
    }

    fun mapReleased() {
        if (BuildConfig.DEBUG) {
            increment(Counter.MAPVIEW_RELEASED)
            activeMaps.updateAndGet(0) { current -> (current - 1).coerceAtLeast(0) }
        }
    }

    fun decoderInitialized() {
        if (BuildConfig.DEBUG) {
            increment(Counter.DECODER_INITIALIZED)
            activeDecoders.incrementAndGet(0)
        }
    }

    fun decoderReleased() {
        if (BuildConfig.DEBUG) {
            increment(Counter.DECODER_RELEASED)
            activeDecoders.updateAndGet(0) { current -> (current - 1).coerceAtLeast(0) }
        }
    }

    fun capture(): LongArray = LongArray(Counter.entries.size) { values.get(it) }

    fun formatDelta(before: LongArray): String {
        if (!BuildConfig.DEBUG) return "disabled"
        return buildString {
            Counter.entries.forEach { append(it.name).append('=').append(values.get(it.ordinal) - before[it.ordinal]).append(' ') }
            append("ACTIVE_PLAYERS=").append(activePlayers.get(0)).append(' ')
            append("ACTIVE_MAPVIEWS=").append(activeMaps.get(0))
            append(" ACTIVE_DECODERS=").append(activeDecoders.get(0))
        }
    }
}
