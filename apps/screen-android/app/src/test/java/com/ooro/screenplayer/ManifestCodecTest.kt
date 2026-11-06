package com.ooro.screenplayer

import com.ooro.screenplayer.api.ManifestCodec
import com.ooro.screenplayer.model.CreativeType
import com.ooro.screenplayer.model.DisplayLayout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class ManifestCodecTest {
    private val payload = """{"version":42,"screenId":"screen-1","timezone":"Asia/Kolkata","layout":{"type":"FOUR_ZONE","primaryWidthPercent":67,"adHeightPercent":86,"qrHeightPercent":47,"newsScrollSpeed":42},"news":{"scrollSpeed":42,"announcements":[{"id":"news-a","text":"Service update","priority":5}]},"items":[{"id":"item-a","campaignId":"campaign-a","creativeId":"creative-a","assetId":"asset-a","type":"IMAGE","url":"https://cdn.example/a.png","checksum":"aaa","durationSeconds":10,"priority":2,"playsPerLoop":1,"daysOfWeek":[1,2],"fitMode":"FIT","offer":{"brandName":"Brand A","promotionalText":"10% OFF","offerTitle":"Offer A","ctaUrl":"https://example.com/a","qrUrl":"https://theooro.com/go/token-a"}},{"id":"item-b","campaignId":"campaign-b","creativeId":"creative-b","assetId":"asset-b","type":"VIDEO","url":"https://cdn.example/b.mp4","checksum":"bbb","durationSeconds":15,"priority":1,"playsPerLoop":2,"offer":{"brandName":"Brand B","offerTitle":"Offer B","qrUrl":"https://theooro.com/go/token-b"}}]}"""

    @Test fun parsesImageVideoOfferAndQrAtomically() {
        val manifest = ManifestCodec.parse(payload)
        assertEquals(42, manifest.version)
        assertEquals(DisplayLayout.FOUR_ZONE, manifest.layout)
        assertEquals(1, manifest.news.announcements.size)
        assertEquals(listOf(CreativeType.IMAGE, CreativeType.VIDEO), manifest.items.map { it.type })
        assertEquals("creative-a", manifest.items[0].creativeId)
        assertEquals("Offer A", manifest.items[0].offer.offerTitle)
        assertEquals("10% OFF", manifest.items[0].offer.promotionalText)
        assertEquals("https://theooro.com/go/token-a", manifest.items[0].offer.qrUrl)
        assertEquals("creative-b", manifest.items[1].creativeId)
        assertEquals("Offer B", manifest.items[1].offer.offerTitle)
        assertEquals(null, manifest.items[1].offer.promotionalText)
        assertEquals("https://theooro.com/go/token-b", manifest.items[1].offer.qrUrl)
    }

    @Test fun layoutVersionDefaultsToV1AndV2RoundTrips() {
        val legacy = ManifestCodec.parse(payload)
        assertEquals(1, legacy.layoutContractVersion)
        val v2 = ManifestCodec.parse(payload.replace("\"type\":\"FOUR_ZONE\"", "\"type\":\"FOUR_ZONE\",\"contractVersion\":2"))
        assertEquals(2, v2.layoutContractVersion)
        assertEquals(2, ManifestCodec.parse(ManifestCodec.encode(v2)).layoutContractVersion)
    }

    @Test fun v3SponsoredImageIsSeparateAndSurvivesCachedManifestEncoding() {
        val body = """{"version":43,"screenId":"screen-1","timezone":"UTC","validUntil":"2030-01-01T00:00:00Z","layout":{"type":"FOUR_ZONE","contractVersion":3,"primaryWidthPercent":80,"adHeightPercent":85,"qrHeightPercent":50},"news":{"announcements":[]},"items":[{"id":"main","campaignId":"main-campaign","creativeId":"main-creative","type":"VIDEO","url":"https://cdn.example/main.mp4","durationSeconds":15}],"sponsoredItem":{"id":"sponsor","campaignId":"sponsor-campaign","creativeId":"sponsor-creative","assetId":"asset-s","type":"IMAGE","url":"https://cdn.example/sponsor.png","checksum":"sha256-value","durationSeconds":10,"fitMode":"FIT"}}"""
        val parsed = ManifestCodec.parse(body)
        assertEquals(3, parsed.layoutContractVersion)
        assertEquals("main", parsed.items.single().id)
        assertEquals(CreativeType.IMAGE, parsed.sponsoredItem?.type)
        assertEquals("sponsor", parsed.sponsoredItem?.id)
        val restored = ManifestCodec.parse(ManifestCodec.encode(parsed))
        assertEquals("sponsor", restored.sponsoredItem?.id)
        assertEquals("sha256-value", restored.sponsoredItem?.checksum)
    }

    @Test fun customLayoutContractRoundTripsAsPresentationMetadata() {
        val contract = """{"contractVersion":1,"mode":"CUSTOM","target":{"width":1280,"height":720},"zones":[]}"""
        val parsed = ManifestCodec.parse(payload.replace("\"items\":", "\"layoutStudioContract\":$contract,\"items\":"))
        assertTrue(parsed.layoutStudioContract?.contains("\"mode\":\"CUSTOM\"") == true)
        val restored = ManifestCodec.parse(ManifestCodec.encode(parsed))
        assertTrue(restored.layoutStudioContract?.contains("\"contractVersion\":1") == true)
        // Layout metadata remains a presentation field; creative and authorization data are unchanged.
        assertEquals(parsed.items.map { it.id }, restored.items.map { it.id })
        assertEquals(parsed.screenId, restored.screenId)
    }

    @Test fun acceptsEmptyManifestAndMissingOptionalOfferMetadata() {
        val empty = ManifestCodec.parse("""{"version":0,"screenId":"screen-1","timezone":"UTC","items":[]}""")
        assertTrue(empty.items.isEmpty())
        val withoutOffer = ManifestCodec.parse("""{"version":1,"screenId":"screen-1","items":[{"id":"i","campaignId":"c","creativeId":"cr","type":"IMAGE","url":"https://example.com/a.png"}]}""")
        assertEquals(null, withoutOffer.items.single().offer.offerTitle)
    }

    @Test fun malformedOrUnknownMediaManifestIsRejectedForLastKnownGoodFallback() {
        listOf("not-json", """{"version":1,"items":[{"id":"i","type":"AUDIO","url":"https://example.com/a"}]}""").forEach { body ->
            try { ManifestCodec.parse(body); fail("Expected invalid manifest to be rejected") } catch (_: Exception) { }
        }
    }
}
