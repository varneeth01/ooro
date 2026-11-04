package com.ooro.screenplayer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import com.ooro.screenplayer.data.ProofEntity
import com.ooro.screenplayer.sync.classifyProofRows
import com.ooro.screenplayer.sync.shouldContinueStaleProofScan
import com.ooro.screenplayer.sync.shouldRetryProofBatch
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

    @Test fun staleProofBatchIsQuarantinedAndScanContinuesUntilCurrentIdentityRowsFound() {
        val stale = ProofEntity("stale", "{\"screenId\":\"old-screen\",\"deviceId\":\"old-device\"}")
        val current = ProofEntity("current", "{\"screenId\":\"screen\",\"deviceId\":\"device\"}")

        val staleBatch = classifyProofRows(listOf(stale), "screen", "device")
        assertTrue(staleBatch.uploadRows.isEmpty())
        assertEquals(listOf("stale"), staleBatch.staleRows.map { it.eventId })
        assertTrue(shouldContinueStaleProofScan(staleBatch.uploadRows.size, pendingCount = 1, scannedBatches = 1, maxBatches = 5))
        assertFalse(shouldContinueStaleProofScan(staleBatch.uploadRows.size, pendingCount = 0, scannedBatches = 1, maxBatches = 5))
        assertFalse(shouldContinueStaleProofScan(staleBatch.uploadRows.size, pendingCount = 1, scannedBatches = 5, maxBatches = 5))

        val currentBatch = classifyProofRows(listOf(current), "screen", "device")
        assertEquals(listOf("current"), currentBatch.uploadRows.map { it.eventId })
        assertTrue(currentBatch.staleRows.isEmpty())
        assertFalse(shouldContinueStaleProofScan(currentBatch.uploadRows.size, pendingCount = 1, scannedBatches = 1, maxBatches = 5))
    }

    @Test fun proofRowsRetryUntilEverySelectedEventIsAcknowledged() {
        assertFalse(shouldRetryProofBatch(selectedCount = 2, acknowledgedCount = 2))
        assertTrue(shouldRetryProofBatch(selectedCount = 2, acknowledgedCount = 1))
        assertTrue(shouldRetryProofBatch(selectedCount = 2, acknowledgedCount = 0))
    }
}
