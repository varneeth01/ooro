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
