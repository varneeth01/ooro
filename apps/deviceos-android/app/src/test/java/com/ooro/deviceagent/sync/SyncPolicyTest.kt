package com.ooro.deviceagent.sync

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import com.ooro.deviceagent.network.resumeRangeStartsAt

class SyncPolicyTest {
    @Test
    fun revokedCredentialIsTerminal() {
        assertTrue(isCredentialTerminal(IllegalStateException("API_401:REVOKED_CREDENTIAL")))
        assertFalse(isCredentialTerminal(IllegalStateException("DOWNLOAD_HTTP_503")))
    }

    @Test
    fun maintenanceWindowBlocksOutsideWindow() {
        val now = java.time.Instant.now()
        assertTrue(withinMaintenanceWindow(now.minusSeconds(10).toString(), now.plusSeconds(10).toString()))
        assertFalse(withinMaintenanceWindow(now.minusSeconds(20).toString(), now.minusSeconds(10).toString()))
        assertFalse(withinMaintenanceWindow("not-a-date", "2026-10-16T11:00:00Z"))
        assertTrue(withinMaintenanceWindow(null, null))
    }

    @Test
    fun resumableDownloadRequiresTheRequestedByteOffset() {
        assertTrue(resumeRangeStartsAt("bytes 1024-2047/4096", 1024))
        assertTrue(resumeRangeStartsAt("bytes 1024-2047/*", 1024))
        assertFalse(resumeRangeStartsAt("bytes 0-2047/4096", 1024))
        assertFalse(resumeRangeStartsAt("bytes 1024-2047/4096", 2048))
        assertFalse(resumeRangeStartsAt(null, 1024))
    }

    @Test
    fun restartRecoveryClassifiesMissingOrInactiveInstallSessions() {
        assertTrue(restartInstallSessionRequiresReconciliation(sessionExists = false, sessionActive = false))
        assertTrue(restartInstallSessionRequiresReconciliation(sessionExists = true, sessionActive = false))
        assertFalse(restartInstallSessionRequiresReconciliation(sessionExists = true, sessionActive = true))
    }

    @Test
    fun retryWaitReopensAPreviouslyFailedLocalAttempt() {
        assertTrue(reopensLocalFailureForRetry(localState = "FAILED", targetState = "RETRY_WAIT"))
        assertTrue(reopensLocalFailureForRetry(localState = "FAILED", targetState = "ASSIGNED"))
        assertFalse(reopensLocalFailureForRetry(localState = "FAILED", targetState = "FAILED"))
        assertFalse(reopensLocalFailureForRetry(localState = "HEALTHY", targetState = "RETRY_WAIT"))
    }

    @Test
    fun pausedCampaignDefersAgentWork() {
        assertTrue(deploymentWorkDeferred("PAUSED"))
        assertFalse(deploymentWorkDeferred("ACTIVE"))
    }
}
