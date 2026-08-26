package com.ooro.driver

import com.ooro.driver.domain.*
import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class RideDomainTest {
    @Test fun pickupDoesNotStartAdvertisingBeforeVerification() { val machine = RideStateMachine(); assertEquals(RideState.RIDE_ACCEPTED, machine.reduce(RideState.IDLE, RideEventType.RIDE_ACCEPTED)); assertEquals(RideState.TO_PICKUP, machine.reduce(RideState.RIDE_ACCEPTED, RideEventType.DRIVER_TO_PICKUP)); assertEquals(RideState.VERIFYING, machine.reduce(RideState.TO_PICKUP, RideEventType.PASSENGER_PICKED_UP)) }
    @Test fun cancellationBeforePickupNeverBecomesPayable() { val machine = RideStateMachine(); assertEquals(RideState.CANCELLED, machine.reduce(RideState.TO_PICKUP, RideEventType.RIDE_CANCELLED)) }
    @Test fun verificationRequiresMultipleSignals() { val event = NormalizedRideEvent(provider = "UBER", eventType = RideEventType.PASSENGER_PICKED_UP, confidence = .94); val result = RideVerificationEngine().verify(listOf(event), emptyList(), null); assertNotEquals(VerificationStatusV2.VERIFIED, result.status); assertTrue(VerificationReason.DISPLAY_OFFLINE in result.reasons) }
    @Test fun validRideCanVerifyWhenDisplayAndMovementAgree() { val now = Instant.now(); val event = NormalizedRideEvent(provider = "UBER", eventType = RideEventType.PASSENGER_PICKED_UP, confidence = .94); val display = DisplayBinding("d", "v", "Display", DisplayState.ACTIVE_PLAYBACK); val samples = listOf(LocationSample(rideId = "r", timestamp = now, latitude = 12.0, longitude = 77.0, accuracyMeters = 20f, speedMps = 6f, bearing = 0f), LocationSample(rideId = "r", timestamp = now.plusSeconds(10), latitude = 12.001, longitude = 77.001, accuracyMeters = 20f, speedMps = 6f, bearing = 0f)); assertEquals(VerificationStatusV2.VERIFIED, RideVerificationEngine().verify(listOf(event), samples, display).status) }
}
