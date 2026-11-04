package com.ooro.screenplayer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import com.ooro.screenplayer.sync.shouldRunWorkerNetworkCheck

class ProofSyncSchedulingTest {
    @Test fun heartbeatDoesNotStartRedundantWorkerWhenQueueIsEmpty() {
        assertFalse(shouldEnqueueProofSync(0))
        assertFalse(shouldEnqueueProofSync(-1))
    }

    @Test fun heartbeatSchedulesWorkerWhenProofsArePending() {
        assertTrue(shouldEnqueueProofSync(1))
        assertTrue(shouldEnqueueProofSync(12))
    }

    @Test fun emptyOneTimeWorkerSkipsDuplicateHeartbeatButPeriodicWorkerStillRuns() {
        assertFalse(shouldRunWorkerNetworkCheck(isScheduledHeartbeat = false, pendingProofCount = 0))
        assertTrue(shouldRunWorkerNetworkCheck(isScheduledHeartbeat = false, pendingProofCount = 1))
        assertTrue(shouldRunWorkerNetworkCheck(isScheduledHeartbeat = true, pendingProofCount = 0))
    }
}
