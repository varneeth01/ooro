package com.ooro.screenplayer

import com.ooro.screenplayer.model.*
import org.junit.Assert.*
import org.junit.Test
import java.time.*

class SchedulingTest {
    @Test fun overnightWindowIncludesBothSidesOfMidnight() { val item = ManifestItem("x", "c", "cr", CreativeType.IMAGE, "", null, 10, 1, null, null, emptySet(), LocalTime.of(22, 0), LocalTime.of(2, 0)); assertTrue(item.isActive(Instant.parse("2026-08-22T22:30:00Z"), ZoneOffset.UTC)); assertTrue(item.isActive(Instant.parse("2026-08-23T01:30:00Z"), ZoneOffset.UTC)); assertFalse(item.isActive(Instant.parse("2026-08-23T12:00:00Z"), ZoneOffset.UTC)) }
    @Test fun expiredItemIsInactive() { val item = ManifestItem("x", "c", "cr", CreativeType.IMAGE, "", null, 10, 1, null, Instant.parse("2026-01-01T00:00:00Z"), emptySet(), null, null); assertFalse(item.isActive(Instant.parse("2026-08-22T00:00:00Z"), ZoneOffset.UTC)) }
}
