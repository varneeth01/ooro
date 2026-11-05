package com.ooro.screenplayer

import com.ooro.screenplayer.model.OfferMetadata
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OfferMetadataTest {
    @Test fun acceptsHttpAndHttpsDestinationsWithHost() {
        assertEquals("https://offers.example/path", OfferMetadata(qrUrl = " https://offers.example/path ").validQrUrl)
        assertEquals("http://offers.example", OfferMetadata(ctaUrl = "http://offers.example").validQrUrl)
    }

    @Test fun rejectsMalformedOrNonWebDestinations() {
        listOf("javascript:alert(1)", "https://", "https:///path", "https://user:pass@example.com", "ftp://offers.example", "not a url")
            .forEach { assertNull("accepted $it", OfferMetadata(qrUrl = it).validQrUrl) }
    }

    @Test fun fallsBackToValidCtaWhenQrDestinationIsInvalid() {
        assertEquals(
            "https://offers.example/cta",
            OfferMetadata(qrUrl = "javascript:alert(1)", ctaUrl = "https://offers.example/cta").validQrUrl
        )
    }
}
