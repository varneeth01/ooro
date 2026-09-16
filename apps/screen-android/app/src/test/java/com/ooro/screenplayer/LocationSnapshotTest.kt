package com.ooro.screenplayer

import com.ooro.screenplayer.location.LocationSnapshots
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class LocationSnapshotTest {
    @Test fun validLocationValuesBecomeTelemetrySnapshotWithoutOptionalSpeedOrBearing() {
        val snapshot = LocationSnapshots.fromValues(13.0827, 80.2707, 11.7, null, null, 1_000L)

        assertNotNull(snapshot)
        assertEquals(13.0827, snapshot!!.latitude, 0.000001)
        assertEquals(80.2707, snapshot.longitude, 0.000001)
        assertEquals(11.7, snapshot.accuracyMeters, 0.001)
        assertNull(snapshot.speedMps)
        assertNull(snapshot.headingDegrees)
    }

    @Test fun impossibleLocationIsIgnored() {
        assertNull(LocationSnapshots.fromValues(91.0, 0.0, 11.7, null, null, 1_000L))
    }
}
