package com.ooro.driver

import com.ooro.driver.network.MockDriverApi
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MockDriverApiScenarioTest {
    @Test fun pendingReviewCannotActivate() = runBlocking {
        val api = MockDriverApi { "SUBMITTED" }
        assertEquals("SUBMITTED", api.onboardingStatus().onboardingStatus)
        assertFalse(api.activationEligibility().eligible)
    }

    @Test fun rejectedDocumentsExposeCorrectionReason() = runBlocking {
        val status = MockDriverApi { "REJECTED" }.onboardingStatus()
        assertEquals("REJECTED", status.onboardingStatus)
        assertEquals("Document is not readable", status.documents.single().rejectionReason)
    }

    @Test fun approvedWithoutDisplayRoutesToDisplaySetupData() = runBlocking {
        val snapshot = MockDriverApi { "APPROVED_NO_DISPLAY" }.dashboard()
        assertEquals("APPROVED", snapshot.onboardingStatus)
        assertNull(snapshot.displayLabel)
        assertTrue(MockDriverApi { "APPROVED" }.activationEligibility().eligible)
    }

    @Test fun suspendedDriverCannotActivate() = runBlocking {
        val api = MockDriverApi { "SUSPENDED" }
        assertEquals("SUSPENDED", api.dashboard().accountStatus)
        assertFalse(api.activationEligibility().eligible)
    }
}
