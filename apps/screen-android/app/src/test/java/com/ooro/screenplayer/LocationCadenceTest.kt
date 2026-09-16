package com.ooro.screenplayer

import com.ooro.screenplayer.location.LocationCadence
import org.junit.Assert.assertEquals
import org.junit.Test

class LocationCadenceTest {
    @Test fun movingHeartbeatUsesFifteenSeconds() { assertEquals(15_000L, LocationCadence.heartbeatIntervalMs(4.0)) }
    @Test fun stationaryOrUnavailableUsesNinetySeconds() { assertEquals(90_000L, LocationCadence.heartbeatIntervalMs(0.0)); assertEquals(90_000L, LocationCadence.heartbeatIntervalMs(null)) }
}
