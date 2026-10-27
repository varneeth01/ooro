package com.ooro.driver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DriverUiContractsTest {
    @Test fun dashboardRequiresServerApprovalAndActiveAccount() {
        assertTrue(isServerApprovedDriver("APPROVED", "ACTIVE"))
        assertFalse(isServerApprovedDriver("SUBMITTED", "ACTIVE"))
        assertFalse(isServerApprovedDriver("APPROVED", "SUSPENDED"))
    }

    @Test fun pairingUsesAssignedVehicleAndNeverDemoFallback() {
        assertEquals("vehicle-123", resolveAssignedVehicleId(null, "vehicle-123"))
        assertEquals("explicit-123", resolveAssignedVehicleId("explicit-123", "vehicle-123"))
    }

    @Test(expected = IllegalStateException::class)
    fun pairingFailsWhenNoVehicleIsAssigned() {
        resolveAssignedVehicleId(null, null)
    }

    @Test fun authenticatedDriversReviewBeforeDashboardAndPairAfterApproval() {
        assertEquals(DriverRoute.AUTH, resolveDriverRoute(false, null, null, null))
        assertEquals(DriverRoute.REVIEW_STATUS, resolveDriverRoute(true, "SUBMITTED", "ACTIVE", null))
        assertEquals(DriverRoute.DISPLAY_SETUP, resolveDriverRoute(true, "APPROVED", "ACTIVE", null))
        assertEquals(DriverRoute.DASHBOARD, resolveDriverRoute(true, "APPROVED", "ACTIVE", "OORO Display"))
        assertEquals(DriverRoute.REVIEW_STATUS, resolveDriverRoute(true, "APPROVED", "SUSPENDED", "OORO Display"))
    }
}
