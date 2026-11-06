package com.ooro.screenplayer

import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.google.zxing.BinaryBitmap
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Uses the debug harness and production Player/OfferPanel; it cannot call APIs or write proofs. */
@RunWith(AndroidJUnit4::class)
class OfferPanelScreenshotTest {
    @Test fun capturesRequestedOfferAndFallbackStatesAt1280Landscape() {
        val cases = listOf(
            "OFFER_BRAND" to true,
            "OFFER_LONG_BRAND" to true,
            "OFFER_LONG_TITLE" to true,
            "OFFER_BRAND_ONLY" to true,
            "OFFER_MISSING_QR" to false,
            "OFFER_INVALID_QR" to false,
            "OFFER_EXPIRED" to false,
            "OFFER_FALLBACK" to false
        )
        cases.forEach { (scenario, brandOffer) -> capture(scenario, brandOffer, "offer-$scenario-1280x720.png") }
    }

    @Test fun v1ManifestKeepsLegacyOfferPanelBehavior() =
        capture("OFFER_V1_LEGACY", true, "offer-v1-legacy-1280x720.png", expectedLegacy = true)

    @Test fun v2ManifestKeepsLegacyOfferPanelBehavior() =
        capture("OFFER_V2_LEGACY", true, "offer-v2-legacy-1280x720.png", expectedLegacy = true, expectedSidebar80 = true)

    @Test fun adaptsOfferCardAndLongTextToSmallerLandscapeResolution() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        assumeTrue("Resolution override is limited to a disposable emulator", isEmulator())
        val oldWidth = device.displayWidth
        val oldHeight = device.displayHeight
        try {
            device.executeShellCommand("wm size 854x480")
            android.os.SystemClock.sleep(900)
            capture("OFFER_LONG_TITLE", true, "offer-OFFER_LONG_TITLE-854x480.png")
            capture("OFFER_FALLBACK", false, "offer-OFFER_FALLBACK-854x480.png")
        } finally {
            device.executeShellCommand("wm size ${oldWidth}x${oldHeight}")
            android.os.SystemClock.sleep(700)
        }
    }

    @Test fun generatedQrIsSquareCachedByDestinationAndDecodesToExactAuthorizedUrl() {
        val destination = "https://offers.example.test/path?id=round-trip"
        val bitmap = qrBitmap(destination, 384)
        assertNotNull("QR generation failed", bitmap)
        val first = requireNotNull(bitmap)
        assertSame("same destination and size should reuse the bitmap", first, qrBitmap(destination, 384))
        assertTrue("different render size must use a separately sized bitmap", qrBitmap(destination, 256)?.width == 256)
        assertEquals(first.width, first.height)
        val pixels = IntArray(first.width * first.height)
        first.getPixels(pixels, 0, first.width, 0, 0, first.width, first.height)
        val source = RGBLuminanceSource(first.width, first.height, pixels)
        val decoded = MultiFormatReader().decode(BinaryBitmap(HybridBinarizer(source)))
        assertEquals(destination, decoded.text)
    }

    private fun capture(scenario: String, expectedBrandOffer: Boolean, fileName: String, expectedLegacy: Boolean = false, expectedSidebar80: Boolean = false) {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        val intent = Intent(context, RenderTestActivity::class.java)
            .putExtra("scenario", scenario)
            .putExtra("layout", "FOUR_ZONE")
            .putExtra("controls", false)
            .putExtra("map", false)
            .putExtra("ticker", false)
            .putExtra("qr", true)
        ActivityScenario.launch<RenderTestActivity>(intent).use {
            val state = when { expectedLegacy -> "OoroOfferState:legacy"; expectedBrandOffer -> "OoroOfferState:brand"; else -> "OoroOfferState:fallback" }
            assertTrue("offer state missing for $scenario", device.wait(Until.hasObject(By.desc(state)), 10_000))
            if (expectedBrandOffer) {
                val qrDescription = if (expectedLegacy) "Advertisement QR code" else "Brand offer QR code"
                assertTrue("brand QR missing for $scenario", device.wait(Until.hasObject(By.desc(qrDescription)), 10_000))
            } else {
                assertTrue("OORO fallback headline missing for $scenario", device.wait(Until.hasObject(By.text("Advertise your business here")), 5_000))
                if (scenario == "OFFER_FALLBACK") assertTrue("OORO advertising contact is incorrect", device.hasObject(By.text("+91 7981399132")))
                assertTrue("fallback must not invent a QR", device.findObject(By.desc("Brand offer QR code")) == null)
            }
            device.wait(Until.findObject(By.text("Got it")), 500)?.click()
            device.waitForIdle()
            android.os.SystemClock.sleep(350)
            assertOfferRegionBounds(device, expectedLegacy, expectedSidebar80)
            val outputDirectory = File(context.getExternalFilesDir(null), "offer-panel-screenshots")
            assertTrue(outputDirectory.mkdirs() || outputDirectory.isDirectory)
            val output = File(outputDirectory, fileName)
            assertTrue("screenshot failed for $scenario", device.takeScreenshot(output))
            assertTrue(output.length() > 0)
            instrumentation.sendStatus(0, android.os.Bundle().apply {
                putString("scenario", scenario)
                putString("screenshot", output.absolutePath)
            })
        }
    }

    private fun assumeDisposableEmulator() = com.ooro.screenplayer.assumeDisposableEmulator()

    private fun assertOfferRegionBounds(device: UiDevice, legacy: Boolean, sidebar80: Boolean) {
        val width = device.displayWidth
        val height = device.displayHeight
        val bounds = device.findObject(By.desc("OoroV3Region:qr-offer"))?.visibleBounds
        assertNotNull("V3 offer panel bounds missing", bounds)
        val rect = requireNotNull(bounds)
        val expectedWidth = width * if (legacy && !sidebar80) 0.33f else 0.2f
        val expectedHeight = height * if (legacy && !sidebar80) 0.32f else 0.5f
        assertTrue("unexpected sidebar width in $width x $height: $rect", kotlin.math.abs(rect.width() - expectedWidth) <= 3f)
        assertTrue("unexpected offer region height in $width x $height: $rect", kotlin.math.abs(rect.height() - expectedHeight) <= 3f)
        val qr = device.findObject(By.desc("Brand offer QR code"))?.visibleBounds ?: device.findObject(By.desc("Advertisement QR code"))?.visibleBounds
        if (qr != null) {
            assertTrue("QR must remain square", kotlin.math.abs(qr.width() - qr.height()) <= 2)
            assertTrue("QR must stay inside offer panel", rect.contains(qr))
        }
    }

    private fun isEmulator(): Boolean = android.os.Build.FINGERPRINT.startsWith("generic") || android.os.Build.MODEL.contains("Emulator", ignoreCase = true) || android.os.Build.PRODUCT.contains("sdk", ignoreCase = true)
}
