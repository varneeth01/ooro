package com.ooro.driver.documents

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import java.io.ByteArrayOutputStream
import kotlin.math.max

object DocumentImageProcessor {
    fun process(resolver: ContentResolver, uri: Uri, rotationDegrees: Int = 0, cropSquare: Boolean = false): ByteArray {
        val source = resolver.openInputStream(uri)?.use(BitmapFactory::decodeStream) ?: error("Unable to read image")
        val rotated = if (rotationDegrees % 360 == 0) source else Bitmap.createBitmap(source, 0, 0, source.width, source.height, Matrix().apply { postRotate(rotationDegrees.toFloat()) }, true)
        val cropped = if (cropSquare) {
            val side = minOf(rotated.width, rotated.height)
            Bitmap.createBitmap(rotated, (rotated.width - side) / 2, (rotated.height - side) / 2, side, side)
        } else rotated
        val scale = max(cropped.width, cropped.height).coerceAtMost(2000).toFloat() / max(cropped.width, cropped.height).toFloat()
        val bounded = if (scale < 1f) Bitmap.createScaledBitmap(cropped, (cropped.width * scale).toInt(), (cropped.height * scale).toInt(), true) else cropped
        return ByteArrayOutputStream().use { output ->
            check(bounded.compress(Bitmap.CompressFormat.JPEG, 85, output)) { "Unable to compress image" }
            output.toByteArray()
        }
    }
}
