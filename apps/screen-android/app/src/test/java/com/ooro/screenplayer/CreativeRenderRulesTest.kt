package com.ooro.screenplayer

import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.LayoutConfig
import com.ooro.screenplayer.player.CreativeScaleBehavior
import com.ooro.screenplayer.player.adRegionFraction
import com.ooro.screenplayer.player.creativeScaleBehavior
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
        assertEquals(0.75f, adRegionFraction(DisplayLayout.SPLIT_50_25_25, config).width, 0f)
    }
}
