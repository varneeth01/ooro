package com.ooro.screenplayer

import com.ooro.screenplayer.layoutstudio.CustomWidgetContent
import com.ooro.screenplayer.layoutstudio.LayoutStudioZone
import com.ooro.screenplayer.layoutstudio.resolveCustomWidgetContent
import com.ooro.screenplayer.model.CreativeType
import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.model.OfferMetadata
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class CustomLayoutContentBindingTest {
    private val now = Instant.parse("2026-11-06T10:00:00Z")
    private val main = item("main", "creative-main", CreativeType.IMAGE)
    private val decorative = item("decor", "creative-decor", CreativeType.IMAGE)
    private val video = item("video", "creative-video", CreativeType.VIDEO)
    private val sponsor = item("sponsor", "creative-sponsor", CreativeType.IMAGE)
    private val manifest = DeviceManifest(
        version = 9, screenId = "screen-a", timezone = "UTC", items = listOf(main, decorative, video),
        validUntil = now.plusSeconds(900), layout = DisplayLayout.FOUR_ZONE, layoutContractVersion = 3,
        sponsoredItem = sponsor,
    )
    private fun item(id: String, creativeId: String, type: CreativeType, offer: OfferMetadata = OfferMetadata()) = ManifestItem(
        id = id, campaignId = "campaign-$id", creativeId = creativeId, type = type,
        url = "https://cdn.example/$id", checksum = "sha256-$id", durationSeconds = 10,
        priority = 0, startAt = null, endAt = null,
        daysOfWeek = emptySet(), startTime = null, endTime = null, assetId = "asset-$id",
        fitMode = FitMode.FIT, offer = offer,
    )
    private fun zone(type: String, binding: String = "APPROVED_CREATIVE", reference: String? = "creative-main") = LayoutStudioZone(
        id = "zone-$type", type = type, label = "Test $type", x = 0.0, y = 0.0,
        width = 1.0, height = 1.0, zIndex = 0, fit = "FIT", bindingKind = binding,
        referenceId = reference, visible = true,
    )
    private val verified = setOf("main", "decor", "video", "sponsor")

    @Test fun `main slot binds only the current verified eligible creative and owns main proof attribution`() {
        val resolved = resolveCustomWidgetContent(zone("MAIN_AD"), manifest, "screen-a", verified, main, now)
        assertEquals(CustomWidgetContent.MainAd(main), resolved)
        assertEquals("MAIN", resolved.proofSlot)
        assertTrue(resolveCustomWidgetContent(zone("MAIN_AD", reference = "wrong"), manifest, "screen-a", verified, main, now) is CustomWidgetContent.Fallback)
    }

    @Test fun `decorative media requires a verified active manifest creative and never owns paid proof`() {
        val resolved = resolveCustomWidgetContent(zone("IMAGE", reference = "creative-decor"), manifest, "screen-a", verified, main, now)
        assertEquals(CustomWidgetContent.DecorativeMedia(decorative), resolved)
        assertNull(resolved.proofSlot)
        assertTrue(resolveCustomWidgetContent(zone("VIDEO", reference = "creative-decor"), manifest, "screen-a", verified, main, now) is CustomWidgetContent.Fallback)
        assertTrue(resolveCustomWidgetContent(zone("IMAGE", reference = "creative-decor"), manifest, "screen-a", verified - "decor", main, now) is CustomWidgetContent.Fallback)
    }

    @Test fun `sponsor is independently manifest authorized and attributed only to sponsor slot`() {
        val resolved = resolveCustomWidgetContent(zone("SPONSORED_AD", "APPROVED_SPONSOR", "creative-sponsor"), manifest, "screen-a", verified, main, now)
        assertEquals(CustomWidgetContent.Sponsor(sponsor), resolved)
        assertEquals("SPONSORED", resolved.proofSlot)
        assertTrue(resolveCustomWidgetContent(zone("SPONSORED_AD", "APPROVED_SPONSOR", "creative-main"), manifest, "screen-a", verified, main, now) is CustomWidgetContent.Fallback)
        assertTrue(resolveCustomWidgetContent(zone("SPONSORED_AD", "APPROVED_SPONSOR", "creative-sponsor"), manifest.copy(layoutContractVersion = 2), "screen-a", verified, main, now) is CustomWidgetContent.Fallback)
    }

    @Test fun `QR requires matching authorized destination metadata and verified active manifest content`() {
        val offer = item("offer", "creative-offer", CreativeType.IMAGE, OfferMetadata(qrUrl = "https://track.example/go/x", authorizedDestinationId = "destination-1"))
        val withOffer = manifest.copy(items = manifest.items + offer)
        val resolved = resolveCustomWidgetContent(zone("QR_OFFER", "AUTHORIZED_DESTINATION", "destination-1"), withOffer, "screen-a", verified + "offer", main, now)
        assertEquals(CustomWidgetContent.Offer(offer), resolved)
        assertNull(resolved.proofSlot)
        assertTrue(resolveCustomWidgetContent(zone("QR_OFFER", "AUTHORIZED_DESTINATION", "destination-2"), withOffer, "screen-a", verified + "offer", main, now) is CustomWidgetContent.Fallback)
        val ctaOnly = item("cta-only", "creative-cta", CreativeType.IMAGE, OfferMetadata(ctaUrl = "https://track.example/go/x", authorizedDestinationId = "destination-3"))
        assertTrue(resolveCustomWidgetContent(zone("QR_OFFER", "AUTHORIZED_DESTINATION", "destination-3"), withOffer.copy(items = withOffer.items + ctaOnly), "screen-a", verified + "cta-only", main, now) is CustomWidgetContent.Fallback)
    }

    @Test fun `expired manifest and screen mismatch fail closed`() {
        assertTrue(resolveCustomWidgetContent(zone("MAIN_AD"), manifest.copy(validUntil = now), "screen-a", verified, main, now) is CustomWidgetContent.Fallback)
        assertTrue(resolveCustomWidgetContent(zone("MAIN_AD"), manifest, "screen-b", verified, main, now) is CustomWidgetContent.Fallback)
    }

    @Test fun `verified cached binding resolves identically after a process-like resolver recreation`() {
        val bound = zone("IMAGE", reference = "creative-decor")
        val first = resolveCustomWidgetContent(bound, manifest, "screen-a", verified, main, now)
        val afterRecreation = resolveCustomWidgetContent(bound, manifest, "screen-a", verified, main, now)
        assertEquals(CustomWidgetContent.DecorativeMedia(decorative), first)
        assertEquals(first, afterRecreation)
        assertNull(afterRecreation.proofSlot)
    }

    @Test fun `plain text is non billable and unsupported capability widgets fall back`() {
        val text = resolveCustomWidgetContent(zone("TEXT", "NONE", null), manifest, "screen-a", verified, main, now)
        assertEquals(CustomWidgetContent.Text("Test TEXT"), text)
        assertNull(text.proofSlot)
        val clock = resolveCustomWidgetContent(zone("CLOCK", "NONE", null), manifest, "screen-a", verified, main, now)
        assertTrue(clock is CustomWidgetContent.Fallback)
        assertNull(clock.proofSlot)
    }
}
