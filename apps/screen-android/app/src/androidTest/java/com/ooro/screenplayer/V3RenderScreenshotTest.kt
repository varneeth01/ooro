package com.ooro.screenplayer

import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Screenshot test for synthetic local content only; the harness has no API or proof path. */
@RunWith(AndroidJUnit4::class)
class V3RenderScreenshotTest {
    @Test fun capturesV3SponsoredLayoutWithProductionPlayerComposables() {
        capture("V3_SPONSORED", "v3-sponsored-layout.png")
    }

    @Test fun capturesNeutralFallbackForExpiredSponsorAuthorization() {
        capture("V3_EXPIRED_SPONSOR", "v3-expired-sponsor-fallback.png")
    }

    @Test fun localV3PresentationUsesNeutralSponsorOnV1ManifestWithoutTicker() {
        capture("V1_LOCAL_V3", "v1-local-v3-neutral-sponsor.png")
    }

    private fun capture(scenarioName: String, fileName: String) {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        prepareDisposableEmulatorUi(device)
        val intent = Intent(context, RenderTestActivity::class.java)
            .putExtra("scenario", scenarioName)
            .putExtra("layout", "FOUR_ZONE")
            .putExtra("controls", false)
            .putExtra("map", false)
            .putExtra("ticker", false)
            .putExtra("qr", true)
        ActivityScenario.launch<RenderTestActivity>(intent).use {
            // Allow local image decode and first Compose frame; no network or campaign work is run by the fixture.
            assertTrue("main test creative did not load", device.wait(Until.hasObject(By.desc("OORO creative")), 10_000))
            if (scenarioName == "V3_SPONSORED") {
                assertTrue("sponsor test creative did not load", device.wait(Until.hasObject(By.desc("Sponsored test advertisement")), 10_000))
            } else if (scenarioName == "V1_LOCAL_V3") {
                assertTrue("local V3 sponsor placeholder missing", device.wait(Until.hasObject(By.desc("Sponsored slot neutral placeholder")), 5_000))
                assertTrue("V1 news ticker was composed under local V3 presentation", device.findObject(By.desc("OoroRegion:news-ticker")) == null)
            } else {
                assertTrue("expired sponsor was rendered", device.findObject(By.desc("Sponsored advertisement")) == null)
            }
            // Android can show an immersive-mode education dialog on first launch. Dismiss it
            // so the captured image represents the player rather than system onboarding.
            device.wait(Until.findObject(By.text("Got it")), 1_000)?.click()
            device.waitForIdle()
            android.os.SystemClock.sleep(400)
            assertV3RegionBounds(device)
            val outputDirectory = File(context.getExternalFilesDir(null), "render-test-screenshots")
            assertTrue("screenshot directory could not be created", outputDirectory.mkdirs() || outputDirectory.isDirectory)
            val output = File(outputDirectory, fileName)
            assertTrue("UIAutomator could not capture the V3 preview", device.takeScreenshot(output))
            assertTrue("screenshot is empty", output.length() > 0)
            instrumentation.sendStatus(0, android.os.Bundle().apply {
                putString("scenario", scenarioName)
                putString("screenshot", output.absolutePath)
            })
        }
    }

    private fun assertV3RegionBounds(device: UiDevice) {
        val width = device.displayWidth
        val height = device.displayHeight
        val adWidth = (width * 0.8f).toInt()
        val mainHeight = (height * 0.85f).toInt()
        val halfHeight = height / 2
        assertRegion(device, "main-ad", 0, 0, adWidth, mainHeight)
        assertRegion(device, "sponsored", 0, mainHeight, adWidth, height)
        assertRegion(device, "qr-offer", adWidth, 0, width, halfHeight)
        assertRegion(device, "navigation", adWidth, halfHeight, width, height)
    }

    private fun assertRegion(device: UiDevice, name: String, left: Int, top: Int, right: Int, bottom: Int) {
        val bounds = device.findObject(By.desc("OoroV3Region:$name"))?.visibleBounds
        assertTrue("V3 region '$name' was not exposed to screenshot instrumentation", bounds != null)
        val actual = requireNotNull(bounds)
        assertTrue("$name left bound $actual", kotlin.math.abs(actual.left - left) <= 2)
        assertTrue("$name top bound $actual", kotlin.math.abs(actual.top - top) <= 2)
        assertTrue("$name right bound $actual", kotlin.math.abs(actual.right - right) <= 2)
        assertTrue("$name bottom bound $actual", kotlin.math.abs(actual.bottom - bottom) <= 2)
    }
}
