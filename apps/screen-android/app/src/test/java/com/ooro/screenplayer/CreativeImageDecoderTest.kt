package com.ooro.screenplayer

import com.ooro.screenplayer.player.calculateImageSampleSize
import org.junit.Assert.assertEquals
import org.junit.Test

class CreativeImageDecoderTest {
    @Test fun landscapeFitsMeasuredRegion() { assertEquals(2, calculateImageSampleSize(3840, 2160, 1280, 720)) }
    @Test fun portraitUsesHeightConstrainedSampling() { assertEquals(2, calculateImageSampleSize(1080, 1920, 1280, 720)) }
    @Test fun squareAndUltrawideAreBounded() {
        assertEquals(1, calculateImageSampleSize(1000, 1000, 1280, 720))
        assertEquals(2, calculateImageSampleSize(3840, 800, 1280, 720))
    }
    @Test fun invalidDimensionsUseSafeFallback() { assertEquals(1, calculateImageSampleSize(0, 100, 0, 720)) }
}
