package com.ooro.screenplayer.player

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlin.math.min
import kotlin.math.ceil

/** Chooses the largest power-of-two sample that retains the FIT target resolution. */
fun calculateImageSampleSize(sourceWidth: Int, sourceHeight: Int, regionWidth: Int, regionHeight: Int): Int {
    if (sourceWidth <= 0 || sourceHeight <= 0 || regionWidth <= 0 || regionHeight <= 0) return 1
    val scale = min(1.0, min(regionWidth.toDouble() / sourceWidth, regionHeight.toDouble() / sourceHeight))
    val targetWidth = ceil(sourceWidth * scale).toInt().coerceAtLeast(1)
    val targetHeight = ceil(sourceHeight * scale).toInt().coerceAtLeast(1)
    var sample = 1
    while (sourceWidth / (sample * 2) >= targetWidth && sourceHeight / (sample * 2) >= targetHeight) sample *= 2
    return sample
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
