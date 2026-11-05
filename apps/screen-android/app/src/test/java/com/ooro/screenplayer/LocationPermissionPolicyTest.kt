package com.ooro.screenplayer

import org.junit.Assert.assertEquals
import org.junit.Test
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

class LocationPermissionPolicyTest {
    @Test fun onlyOnePermissionRequestCanBeInFlight() {
        val gate = LocationPermissionRequestGate()
        assertEquals(true, gate.tryBegin())
        assertEquals(false, gate.tryBegin())
        assertEquals(true, gate.isInFlight)
        gate.complete()
        assertEquals(false, gate.isInFlight)
        assertEquals(true, gate.tryBegin())
    }
    @Test fun optionalLocationIsNotAvailableWithoutHardwareFeature() {
        assertEquals(OptionalLocationState.UNAVAILABLE, optionalLocationState(false, false, 0, false, false))
    }
    @Test fun actualGrantTakesPrecedenceOverMissingFeatureMetadata() {
        assertEquals(OptionalLocationState.GRANTED, optionalLocationState(true, false, 0, false, false))
    }
    @Test fun coldLaunchNeverImpliesARequestAndShowsDeniedState() {
        assertEquals(OptionalLocationState.NOT_REQUESTED, optionalLocationState(false, true, 0, false, false))
    }
    @Test fun grantedStateAlwaysUsesCurrentPlatformResult() {
        assertEquals(OptionalLocationState.GRANTED, optionalLocationState(true, true, 3, true, false))
    }
    @Test fun deniedWithRationaleCanBeRequestedAgainOnlyByExplicitAction() {
        assertEquals(OptionalLocationState.DENIED, optionalLocationState(false, true, 1, true, true))
    }
    @Test fun requestWithoutRecordedDenialDoesNotGuessPermanentDenial() {
        assertEquals(OptionalLocationState.DENIED, optionalLocationState(false, true, 1, false, false))
    }
    @Test fun deniedWithoutRationaleAfterAnExplicitDenialUsesSettingsRoute() {
        assertEquals(OptionalLocationState.PERMANENTLY_DENIED, optionalLocationState(false, true, 1, true, false))
    }
    @Test fun permissionResetAfterEarlierGrantRemainsRequestable() {
        assertEquals(OptionalLocationState.DENIED, optionalLocationState(false, true, 3, true, false, wasGrantedBefore = true))
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class LocationPermissionHistoryTest {
    @Test fun requestAndConsentResultPersistSeparately() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        context.getSharedPreferences("ooro_permission_history", Context.MODE_PRIVATE).edit().clear().commit()
        val history = LocationPermissionHistory(context)
        history.recordRequest()
        assertEquals(1, history.attempts)
        assertEquals(false, history.wasDenied)
        history.recordDenied()
        assertEquals(true, LocationPermissionHistory(context).wasDenied)
        history.recordGranted()
        assertEquals(true, LocationPermissionHistory(context).wasGranted)
    }
}
