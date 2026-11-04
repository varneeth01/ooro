package com.ooro.screenplayer.player

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlin.math.min
import kotlin.math.ceil

/** Chooses an integer sample size that keeps decoded dimensions at or below the FIT target. */
fun calculateImageSampleSize(sourceWidth: Int, sourceHeight: Int, regionWidth: Int, regionHeight: Int): Int {
    if (sourceWidth <= 0 || sourceHeight <= 0 || regionWidth <= 0 || regionHeight <= 0) return 1
    val scale = min(1.0, min(regionWidth.toDouble() / sourceWidth, regionHeight.toDouble() / sourceHeight))
    val targetWidth = ceil(sourceWidth * scale).toInt().coerceAtLeast(1)
    val targetHeight = ceil(sourceHeight * scale).toInt().coerceAtLeast(1)
    val widthSample = ceil(sourceWidth.toDouble() / targetWidth).toInt()
    val heightSample = ceil(sourceHeight.toDouble() / targetHeight).toInt()
    return maxOf(1, widthSample, heightSample)
}

fun decodeCreativeImage(path: String, regionWidth: Int, regionHeight: Int): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    val options = BitmapFactory.Options().apply {
        inSampleSize = calculateImageSampleSize(bounds.outWidth, bounds.outHeight, regionWidth, regionHeight)
        inPreferredConfig = Bitmap.Config.ARGB_8888
        inScaled = false
    }
    return BitmapFactory.decodeFile(path, options)
}
