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
data class Sidebar80Geometry(val adWidth: Int, val sidebarWidth: Int, val offerHeight: Int, val navigationHeight: Int, val mediaHeight: Int, val tickerHeight: Int)
data class SponsoredLayoutGeometry(val mainAdWidth: Int, val sidebarWidth: Int, val mainAdHeight: Int, val sponsoredHeight: Int, val qrHeight: Int, val mapHeight: Int)
fun usesSidebar80(layout: DisplayLayout, version: Int) = version >= 2 && (layout == DisplayLayout.FOUR_ZONE || layout == DisplayLayout.AD_NAV_OFFER)
fun usesSponsoredLayout(layout: DisplayLayout, version: Int) = version >= 3 && (layout == DisplayLayout.FOUR_ZONE || layout == DisplayLayout.AD_NAV_OFFER)
fun sponsoredLayoutGeometry(width: Int, height: Int): SponsoredLayoutGeometry {
    val mainWidth = (width * 0.8f).toInt()
    val sidebar = width - mainWidth
    val mainHeight = (height * 0.85f).toInt()
    val qr = height / 2
    return SponsoredLayoutGeometry(mainWidth, sidebar, mainHeight, height - mainHeight, qr, height - qr)
}
fun sidebar80Geometry(width: Int, height: Int, config: LayoutConfig): Sidebar80Geometry {
    val adWidth = (width * 0.8f).toInt()
    val ticker = (height * (100 - config.safeAdHeight) / 100f).toInt()
    val offer = height / 2
    return Sidebar80Geometry(adWidth, width - adWidth, offer, height - offer, height - ticker, ticker)
}

/** Pixel bounds for Compose ContentScale.Fit and Media3 RESIZE_MODE_FIT. */
fun fittedContentBounds(sourceWidth: Int, sourceHeight: Int, regionWidth: Int, regionHeight: Int): FittedContentBounds {
    if (sourceWidth <= 0 || sourceHeight <= 0 || regionWidth <= 0 || regionHeight <= 0) return FittedContentBounds(0, 0)
    val scale = min(regionWidth.toDouble() / sourceWidth, regionHeight.toDouble() / sourceHeight)
    return FittedContentBounds(
        width = (sourceWidth * scale).roundToInt().coerceIn(1, regionWidth),
        height = (sourceHeight * scale).roundToInt().coerceIn(1, regionHeight)
    )
}

fun adRegionFraction(layout: DisplayLayout, config: LayoutConfig, contractVersion: Int = 1): AdRegionFraction = when {
    usesSponsoredLayout(layout, contractVersion) -> AdRegionFraction(0.8f, 0.85f)
    usesSidebar80(layout, contractVersion) -> AdRegionFraction(0.8f, config.safeAdHeight / 100f)
    layout == DisplayLayout.FOUR_ZONE || layout == DisplayLayout.AD_NAV_OFFER -> AdRegionFraction(config.safePrimaryWidth / 100f, config.safeAdHeight / 100f)
    layout == DisplayLayout.SPLIT_50_25_25 -> AdRegionFraction(0.5f, 1f)
    else -> AdRegionFraction(1f, 1f)
}
