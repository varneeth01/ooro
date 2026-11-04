package com.ooro.screenplayer

import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.LayoutConfig
import com.ooro.screenplayer.player.CreativeScaleBehavior
import com.ooro.screenplayer.player.adRegionFraction
import com.ooro.screenplayer.player.creativeScaleBehavior
import com.ooro.screenplayer.player.fittedContentBounds
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CreativeRenderRulesTest {
    @Test fun fitAndLegacyFillContainWhileExplicitCropCrops() {
        assertEquals(CreativeScaleBehavior.CONTAIN, creativeScaleBehavior(FitMode.FIT))
        assertEquals(CreativeScaleBehavior.CONTAIN, creativeScaleBehavior(FitMode.FILL))
        assertEquals(CreativeScaleBehavior.CROP, creativeScaleBehavior(FitMode.CENTER_CROP))
    }
    @Test fun layoutRegionsStayWithinScreenBounds() {
        val config = LayoutConfig()
        for (layout in DisplayLayout.values()) {
            val region = adRegionFraction(layout, config)
            assertTrue(region.width in 0f..1f && region.height in 0f..1f)
        }
        assertEquals(0.89f, adRegionFraction(DisplayLayout.FOUR_ZONE, config).height, 0f)
        assertEquals(0.5f, adRegionFraction(DisplayLayout.SPLIT_50_25_25, config).width, 0f)
    }
    @Test fun contractV2Uses1024By720AdsAnd256By720SidebarAt1280By720() {
        val bounds = com.ooro.screenplayer.player.sidebar80Geometry(1280, 720, LayoutConfig(primaryWidthPercent = 55, adHeightPercent = 89))
        assertEquals(1024, bounds.adWidth); assertEquals(256, bounds.sidebarWidth)
        assertEquals(360, bounds.offerHeight); assertEquals(360, bounds.navigationHeight)
        assertEquals(641, bounds.mediaHeight); assertEquals(79, bounds.tickerHeight)
        assertEquals(0.8f, adRegionFraction(DisplayLayout.FOUR_ZONE, LayoutConfig(), 2).width, 0f)
        assertEquals(0.67f, adRegionFraction(DisplayLayout.FOUR_ZONE, LayoutConfig(), 1).width, 0f)
        assertEquals(0.5f, adRegionFraction(DisplayLayout.SPLIT_50_25_25, LayoutConfig(), 2).width, 0f)
    }

    @Test fun fitBoundsContainLandscapePortraitSquareUltrawideAndNonstandardMedia() {
        assertEquals(800 to 450, fittedContentBounds(1920, 1080, 800, 600).let { it.width to it.height })
        assertEquals(338 to 600, fittedContentBounds(1080, 1920, 800, 600).let { it.width to it.height })
        assertEquals(600 to 600, fittedContentBounds(1200, 1200, 800, 600).let { it.width to it.height })
        assertEquals(800 to 250, fittedContentBounds(2560, 800, 800, 600).let { it.width to it.height })
        assertEquals(800 to 560, fittedContentBounds(1000, 700, 800, 600).let { it.width to it.height })
    }

    @Test fun fitBoundsNeverExceedTheAllocatedRegion() {
        val viewports = listOf(1280 to 720, 858 to 641, 422 to 252, 960 to 360)
        val sources = listOf(1920 to 1080, 1080 to 1920, 1200 to 1200, 2560 to 800, 1000 to 700)
        sources.forEach { source -> viewports.forEach { viewport ->
            val bounds = fittedContentBounds(source.first, source.second, viewport.first, viewport.second)
            assertTrue(bounds.width in 1..viewport.first)
            assertTrue(bounds.height in 1..viewport.second)
            assertEquals(source.first.toDouble() / source.second, bounds.width.toDouble() / bounds.height, 0.01)
        } }
    }
}
