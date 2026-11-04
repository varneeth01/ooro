package com.ooro.screenplayer

/** Stable keys keep expensive media work scoped to actual creative changes. */
internal data class CreativeImageDecodeKey(val path: String, val widthPx: Int, val heightPx: Int)

internal data class CreativePlaybackKey(val itemId: String, val playbackKey: Int, val preview: Boolean)

/** Animate ticker text only when it would otherwise be clipped by its viewport. */
internal fun tickerNeedsScroll(hasAnnouncements: Boolean, textWidthPx: Float, viewportWidthPx: Float): Boolean =
    hasAnnouncements && textWidthPx.isFinite() && viewportWidthPx.isFinite() && textWidthPx > viewportWidthPx && viewportWidthPx > 0f

/** Avoid rebinding an Android view when it already owns the requested player instance. */
internal fun <T : Any> needsIdentityBinding(current: T?, desired: T?): Boolean = current !== desired

internal fun navigationMapIsVisible(active: Boolean): Boolean = active
