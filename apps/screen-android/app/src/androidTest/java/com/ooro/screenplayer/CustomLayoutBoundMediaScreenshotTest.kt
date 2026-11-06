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

@RunWith(AndroidJUnit4::class)
class CustomLayoutBoundMediaScreenshotTest {
    @Test fun productionPlayerRendersAuthorizedSyntheticImageBindingWithoutNetworkOrProof() {
        captureBoundLayout("landscape", "custom-bound-image.png")
    }

    @Test fun productionMedia3PathRendersSyntheticVideoBindingWithoutNetworkOrProof() {
        captureBoundLayout("video-landscape-720p", "custom-bound-video.png")
    }

    private fun captureBoundLayout(asset: String, filename: String) {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val intent = Intent(context, RenderTestActivity::class.java)
            .putExtra("scenario", "LAYOUT_STUDIO_BOUND_MEDIA")
            .putExtra("asset", asset)
            .putExtra("controls", false)
            .putExtra("qr", true)
        ActivityScenario.launch<RenderTestActivity>(intent).use {
            val device = UiDevice.getInstance(instrumentation)
            assertTrue("Main bound slot not rendered", device.wait(Until.hasObject(By.desc("LayoutStudioZone:custom-main")), 10_000))
            assertTrue("Sponsor slot not rendered", device.wait(Until.hasObject(By.desc("LayoutStudioZone:custom-sponsor")), 10_000))
            assertTrue("Authorized QR offer slot not rendered", device.wait(Until.hasObject(By.desc("LayoutStudioZone:custom-offer")), 10_000))
            device.waitForIdle()
            val outputDir = File(context.getExternalFilesDir(null), "layout-studio-bound-media")
            assertTrue(outputDir.mkdirs() || outputDir.isDirectory)
            val output = File(outputDir, filename)
            assertTrue("Unable to capture custom media screenshot", device.takeScreenshot(output))
            assertTrue(output.length() > 0)
            instrumentation.sendStatus(0, android.os.Bundle().apply {
                putString("screenshot", output.absolutePath)
                putString("creative", asset)
                putString("proofs", "disabled")
                putString("network", "disabled")
            })
        }
    }
}
