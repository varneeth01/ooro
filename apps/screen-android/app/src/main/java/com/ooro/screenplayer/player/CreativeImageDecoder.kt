package com.ooro.screenplayer.player

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import kotlin.math.min
import kotlin.math.ceil

/** Chooses the largest power-of-two sample that retains the FIT target resolution. */
fun calculateImageSampleSize(sourceWidth: Int, sourceHeight: Int, regionWidth: Int, regionHeight: Int, rotationDegrees: Int = 0): Int {
    if (sourceWidth <= 0 || sourceHeight <= 0 || regionWidth <= 0 || regionHeight <= 0) return 1
    val quarterTurn = rotationDegrees % 180 != 0
    val regionTargetWidth = if (quarterTurn) regionHeight else regionWidth
    val regionTargetHeight = if (quarterTurn) regionWidth else regionHeight
    val scale = min(1.0, min(regionTargetWidth.toDouble() / sourceWidth, regionTargetHeight.toDouble() / sourceHeight))
    val decodedTargetWidth = ceil(sourceWidth * scale).toInt().coerceAtLeast(1)
    val decodedTargetHeight = ceil(sourceHeight * scale).toInt().coerceAtLeast(1)
    var sample = 1
    while (sourceWidth / (sample * 2) >= decodedTargetWidth && sourceHeight / (sample * 2) >= decodedTargetHeight) sample *= 2
    return sample
}

fun decodeCreativeImage(path: String, regionWidth: Int, regionHeight: Int): Bitmap? {
    val exif = runCatching { ExifInterface(path) }.getOrNull()
    val rotation = exif?.rotationDegrees ?: 0
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    val options = BitmapFactory.Options().apply {
        inSampleSize = calculateImageSampleSize(bounds.outWidth, bounds.outHeight, regionWidth, regionHeight, rotation)
        inPreferredConfig = Bitmap.Config.ARGB_8888
        inScaled = false
    }
    val decoded = BitmapFactory.decodeFile(path, options) ?: return null
    if (rotation == 0 && exif?.isFlipped != true) return decoded
    val transform = Matrix().apply {
        if (exif?.isFlipped == true) preScale(-1f, 1f)
        if (rotation != 0) postRotate(rotation.toFloat())
    }
    return runCatching { Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, transform, true) }
        .getOrNull()?.also { if (it !== decoded) decoded.recycle() }
        ?: decoded
}
