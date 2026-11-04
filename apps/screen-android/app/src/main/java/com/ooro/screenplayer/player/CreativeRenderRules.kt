package com.ooro.screenplayer.player

import com.ooro.screenplayer.model.DisplayLayout
import com.ooro.screenplayer.model.FitMode
import com.ooro.screenplayer.model.LayoutConfig
import kotlin.math.min
import kotlin.math.roundToInt

enum class CreativeScaleBehavior { CONTAIN, CROP }

/** Legacy FILL is made safe; cropping occurs only when explicitly set to CENTER_CROP. */
fun creativeScaleBehavior(mode: FitMode): CreativeScaleBehavior =
    if (mode == FitMode.CENTER_CROP) CreativeScaleBehavior.CROP else CreativeScaleBehavior.CONTAIN

data class AdRegionFraction(val width: Float, val height: Float) {
    init { require(width in 0f..1f && height in 0f..1f) }
}

data class FittedContentBounds(val width: Int, val height: Int)

/** Pixel bounds for Compose ContentScale.Fit and Media3 RESIZE_MODE_FIT. */
fun fittedContentBounds(sourceWidth: Int, sourceHeight: Int, regionWidth: Int, regionHeight: Int): FittedContentBounds {
    if (sourceWidth <= 0 || sourceHeight <= 0 || regionWidth <= 0 || regionHeight <= 0) return FittedContentBounds(0, 0)
    val scale = min(regionWidth.toDouble() / sourceWidth, regionHeight.toDouble() / sourceHeight)
    return FittedContentBounds(
        width = (sourceWidth * scale).roundToInt().coerceIn(1, regionWidth),
        height = (sourceHeight * scale).roundToInt().coerceIn(1, regionHeight)
    )
}

fun adRegionFraction(layout: DisplayLayout, config: LayoutConfig): AdRegionFraction = when (layout) {
    DisplayLayout.FOUR_ZONE, DisplayLayout.AD_NAV_OFFER -> AdRegionFraction(config.safePrimaryWidth / 100f, config.safeAdHeight / 100f)
    DisplayLayout.SPLIT_50_25_25 -> AdRegionFraction(0.5f, 1f)
    DisplayLayout.FULLSCREEN_AD, DisplayLayout.FULLSCREEN_SERVICE, DisplayLayout.SPECIAL_CAMPAIGN -> AdRegionFraction(1f, 1f)
}
