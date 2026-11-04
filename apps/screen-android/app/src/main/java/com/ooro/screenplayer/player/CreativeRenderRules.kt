package com.ooro.screenplayer.player

import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.LayoutConfig

enum class CreativeScaleBehavior { CONTAIN, CROP }

/** Legacy FILL is made safe; cropping occurs only when explicitly set to CENTER_CROP. */
fun creativeScaleBehavior(mode: FitMode): CreativeScaleBehavior =
    if (mode == FitMode.CENTER_CROP) CreativeScaleBehavior.CROP else CreativeScaleBehavior.CONTAIN

data class AdRegionFraction(val width: Float, val height: Float) {
    init { require(width in 0f..1f && height in 0f..1f) }
}

fun adRegionFraction(layout: DisplayLayout, config: LayoutConfig): AdRegionFraction = when (layout) {
    DisplayLayout.FOUR_ZONE, DisplayLayout.AD_NAV_OFFER -> AdRegionFraction(config.safePrimaryWidth / 100f, config.safeAdHeight / 100f)
    DisplayLayout.SPLIT_50_25_25 -> AdRegionFraction(0.75f, 1f)
    DisplayLayout.FULLSCREEN_AD, DisplayLayout.FULLSCREEN_SERVICE, DisplayLayout.SPECIAL_CAMPAIGN -> AdRegionFraction(1f, 1f)
}
