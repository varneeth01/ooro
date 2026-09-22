package com.ooro.screenplayer

import com.ooro.screenplayer.model.*
import org.junit.Assert.*
import org.junit.Test
import java.time.*

class SchedulingTest {
    @Test fun overnightWindowIncludesBothSidesOfMidnight() { val item = ManifestItem("x", "c", "cr", CreativeType.IMAGE, "", null, 10, 1, null, null, emptySet(), LocalTime.of(22, 0), LocalTime.of(2, 0)); assertTrue(item.isActive(Instant.parse("2026-08-22T22:30:00Z"), ZoneOffset.UTC)); assertTrue(item.isActive(Instant.parse("2026-08-23T01:30:00Z"), ZoneOffset.UTC)); assertFalse(item.isActive(Instant.parse("2026-08-23T12:00:00Z"), ZoneOffset.UTC)) }
    @Test fun expiredItemIsInactive() { val item = ManifestItem("x", "c", "cr", CreativeType.IMAGE, "", null, 10, 1, null, Instant.parse("2026-01-01T00:00:00Z"), emptySet(), null, null); assertFalse(item.isActive(Instant.parse("2026-08-22T00:00:00Z"), ZoneOffset.UTC)) }
    @Test fun completionOffsetAdvancesAndWrapsAcrossCreatives() { val first = ManifestItem("a", "campaign-a", "creative-a", CreativeType.IMAGE, "", null, 10, 1, null, null, emptySet(), null, null, offer = OfferMetadata(offerTitle = "Offer A", qrUrl = "https://example.com/a")); val second = first.copy(id = "b", campaignId = "campaign-b", creativeId = "creative-b", offer = OfferMetadata(offerTitle = "Offer B", qrUrl = "https://example.com/b")); val manifest = DeviceManifest(1, "screen", "UTC", listOf(first, second), null); val engine = com.ooro.screenplayer.player.ScheduleEngine(); assertEquals("creative-a", engine.next(manifest, offset = 0)?.creativeId); assertEquals("Offer B", engine.next(manifest, offset = 1)?.offer?.offerTitle); assertEquals("https://example.com/b", engine.next(manifest, offset = 1)?.offer?.qrUrl); assertEquals("creative-a", engine.next(manifest, offset = 2)?.creativeId) }
}
