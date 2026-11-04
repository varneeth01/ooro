package com.ooro.screenplayer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProofSyncSchedulingTest {
    @Test fun heartbeatDoesNotStartRedundantWorkerWhenQueueIsEmpty() {
        assertFalse(shouldEnqueueProofSync(0))
        assertFalse(shouldEnqueueProofSync(-1))
    }

    @Test fun heartbeatSchedulesWorkerWhenProofsArePending() {
        assertTrue(shouldEnqueueProofSync(1))
        assertTrue(shouldEnqueueProofSync(12))
    }
}
