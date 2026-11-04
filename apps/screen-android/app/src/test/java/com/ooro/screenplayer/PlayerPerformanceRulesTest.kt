package com.ooro.screenplayer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlayerPerformanceRulesTest {
    @Test fun staticOrFittingTickerTextDoesNotAnimate() {
        assertFalse(tickerNeedsScroll(true, true, false, 400f, 200f))
        assertFalse(tickerNeedsScroll(true, true, true, 200f, 200f))
        assertFalse(tickerNeedsScroll(true, true, true, 100f, 200f))
    }

    @Test fun tickerScrollsOnlyWhenMeasuredTextExceedsViewport() {
        assertTrue(tickerNeedsScroll(true, true, true, 201f, 200f))
        assertFalse(tickerNeedsScroll(true, true, true, Float.POSITIVE_INFINITY, 200f))
    }

    @Test fun tickerAnimationStopsWhenHiddenOrLifecyclePaused() {
        assertFalse(tickerNeedsScroll(false, true, true, 500f, 200f))
        assertFalse(tickerNeedsScroll(true, false, true, 500f, 200f))
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
