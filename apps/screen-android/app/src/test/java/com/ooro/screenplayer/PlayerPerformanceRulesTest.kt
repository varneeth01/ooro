package com.ooro.screenplayer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlayerPerformanceRulesTest {
    @Test fun staticOrFittingTickerTextDoesNotAnimate() {
        assertFalse(tickerNeedsScroll(hasAnnouncements = false, textWidthPx = 400f, viewportWidthPx = 200f))
        assertFalse(tickerNeedsScroll(hasAnnouncements = true, textWidthPx = 200f, viewportWidthPx = 200f))
        assertFalse(tickerNeedsScroll(hasAnnouncements = true, textWidthPx = 100f, viewportWidthPx = 200f))
    }

    @Test fun tickerScrollsOnlyWhenMeasuredTextExceedsViewport() {
        assertTrue(tickerNeedsScroll(hasAnnouncements = true, textWidthPx = 201f, viewportWidthPx = 200f))
        assertFalse(tickerNeedsScroll(hasAnnouncements = true, textWidthPx = Float.POSITIVE_INFINITY, viewportWidthPx = 200f))
    }

    @Test fun unchangedImageKeyDoesNotInvalidateDecodeAndSizeChangeDoes() {
        val first = CreativeImageDecodeKey("/cache/creative.jpg", 640, 720)
        assertEquals(first, CreativeImageDecodeKey("/cache/creative.jpg", 640, 720))
        assertNotEquals(first, CreativeImageDecodeKey("/cache/creative.jpg", 320, 360))
        assertNotEquals(first, CreativeImageDecodeKey("/cache/other.jpg", 640, 720))
    }

    @Test fun unchangedCreativeKeepsMediaPlayerIdentityKey() {
        val first = CreativePlaybackKey("manifest-item", playbackKey = 2, preview = false)
        assertEquals(first, CreativePlaybackKey("manifest-item", playbackKey = 2, preview = false))
        assertNotEquals(first, CreativePlaybackKey("manifest-item", playbackKey = 3, preview = false))
        assertNotEquals(first, CreativePlaybackKey("different-item", playbackKey = 2, preview = false))
    }

    @Test fun playerViewOnlyNeedsBindingForDifferentPlayerInstance() {
        val player = Any()
        assertFalse(needsIdentityBinding(player, player))
        assertTrue(needsIdentityBinding(player, Any()))
    }

    @Test fun mapIsAbsentUnlessNavigationIsActive() {
        assertFalse(navigationMapIsVisible(active = false))
        assertTrue(navigationMapIsVisible(active = true))
    }
}
