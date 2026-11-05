package com.ooro.screenplayer

import org.junit.Assert.assertEquals
import org.junit.Test

class LocationPermissionPolicyTest {
    @Test fun optionalLocationIsNotAvailableWithoutHardwareFeature() {
        assertEquals(OptionalLocationState.UNAVAILABLE, optionalLocationState(false, false, 0, false))
    }
    @Test fun actualGrantTakesPrecedenceOverMissingFeatureMetadata() {
        assertEquals(OptionalLocationState.GRANTED, optionalLocationState(true, false, 0, false))
    }
    @Test fun coldLaunchNeverImpliesARequestAndShowsDeniedState() {
        assertEquals(OptionalLocationState.DENIED, optionalLocationState(false, true, 0, false))
    }
    @Test fun grantedStateAlwaysUsesCurrentPlatformResult() {
        assertEquals(OptionalLocationState.GRANTED, optionalLocationState(true, true, 3, false))
    }
    @Test fun deniedWithRationaleCanBeRequestedAgainOnlyByExplicitAction() {
        assertEquals(OptionalLocationState.DENIED, optionalLocationState(false, true, 1, true))
    }
    @Test fun deniedWithoutRationaleAfterAttemptIsSettingsState() {
        assertEquals(OptionalLocationState.PERMANENTLY_DENIED, optionalLocationState(false, true, 1, false))
    }
    @Test fun permissionResetAfterEarlierGrantRemainsRequestable() {
        assertEquals(OptionalLocationState.DENIED, optionalLocationState(false, true, 3, false, wasGrantedBefore = true))
    }
}
