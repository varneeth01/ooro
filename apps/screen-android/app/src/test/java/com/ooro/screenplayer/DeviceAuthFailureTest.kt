package com.ooro.screenplayer

import com.ooro.screenplayer.api.DeviceFailureKind
import com.ooro.screenplayer.api.classifyDeviceFailure
import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceAuthFailureTest {
    @Test fun expiredAndRevokedCredentialsAreDistinguished() {
        assertEquals(DeviceFailureKind.AUTH_EXPIRED, classifyDeviceFailure(401, "TOKEN_EXPIRED"))
        assertEquals(DeviceFailureKind.AUTH_REVOKED, classifyDeviceFailure(401, "DEVICE_REVOKED"))
        assertEquals(DeviceFailureKind.AUTH_INVALID, classifyDeviceFailure(401, "INVALID_DEVICE_CREDENTIALS"))
    }

    @Test fun connectivityAndServerFailuresAreNotReportedAsAuthFailures() {
        assertEquals(DeviceFailureKind.SERVER_UNAVAILABLE, classifyDeviceFailure(503, "UPSTREAM_UNAVAILABLE"))
        assertEquals(DeviceFailureKind.DEVICE_NOT_FOUND, classifyDeviceFailure(404, "DEVICE_NOT_FOUND"))
        assertEquals(DeviceFailureKind.PAIRING_REQUIRED, classifyDeviceFailure(404, ""))
    }
}
