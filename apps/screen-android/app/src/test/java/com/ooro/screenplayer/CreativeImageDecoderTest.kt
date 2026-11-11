package com.ooro.screenplayer

import com.ooro.screenplayer.player.calculateImageSampleSize
import org.junit.Assert.assertEquals
import org.junit.Test

class CreativeImageDecoderTest {
    @Test fun imageSampleSizeUsesDisplayOrientationForExifQuarterTurns() {
        assertEquals(
            calculateImageSampleSize(1920, 1080, 600, 800),
            calculateImageSampleSize(1920, 1080, 800, 600, rotationDegrees = 90)
        )
        assertEquals(
            calculateImageSampleSize(1920, 1080, 600, 800),
            calculateImageSampleSize(1920, 1080, 800, 600, rotationDegrees = 270)
        )
        assertEquals(
            calculateImageSampleSize(1920, 1080, 800, 600),
            calculateImageSampleSize(1920, 1080, 800, 600, rotationDegrees = 180)
        )
    }
}
