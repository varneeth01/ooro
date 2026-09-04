package com.ooro.screenplayer.player

/** Business policy is kept in one place so player timing is testable and configurable. */
data class ProofPolicy(val completionRatio: Double = 0.90, val toleranceMs: Long = 1_000) {
    fun videoSuccess(expectedMs: Long, actualMs: Long) = actualMs >= minOf((expectedMs * completionRatio).toLong(), (expectedMs - toleranceMs).coerceAtLeast(0))
}
