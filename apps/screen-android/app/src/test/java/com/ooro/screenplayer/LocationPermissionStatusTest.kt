package com.ooro.screenplayer

import org.junit.Assert.assertEquals
import org.junit.Test

class LocationPermissionStatusTest {
    @Test fun deniedPermissionExplainsUnavailableLocationFeatures() {
        assertEquals("Not granted · live location features unavailable", locationPermissionStatus(false, false))
    }

    @Test fun grantedPermissionWithoutFixReportsWaitingState() {
        assertEquals("Granted · waiting for location fix", locationPermissionStatus(true, false))
    }

    @Test fun grantedPermissionWithFixReportsAvailability() {
        assertEquals("Available", locationPermissionStatus(true, true))
    }
}
