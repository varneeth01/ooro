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

/** Exercises the production player with only local synthetic media: no API or proof path exists. */
@RunWith(AndroidJUnit4::class)
class OfflineCachedStartupScreenshotTest {
    @Test fun locallyCachedEligibleCreativeRendersAtStartupWhileNetworkIsNotUsed() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        val intent = Intent(context, RenderTestActivity::class.java)
            .putExtra("scenario", "OFFLINE_CACHED_STARTUP")
            .putExtra("controls", false)
            .putExtra("map", false)
            .putExtra("ticker", false)
            .putExtra("qr", false)

        ActivityScenario.launch<RenderTestActivity>(intent).use {
            device.wait(Until.findObject(By.text("Got it")), 1_000)?.click()
            assertTrue("local cached creative was not rendered", device.wait(Until.hasObject(By.desc("OORO creative")), 10_000))
            assertTrue("offline fixture should remain the foreground test activity", device.currentPackageName == context.packageName)
            device.waitForIdle()
            val outputDirectory = File(context.getExternalFilesDir(null), "render-test-screenshots")
            assertTrue(outputDirectory.mkdirs() || outputDirectory.isDirectory)
            val screenshot = File(outputDirectory, "offline-cached-startup.png")
            assertTrue(device.takeScreenshot(screenshot))
            assertTrue(screenshot.length() > 0)
            instrumentation.sendStatus(0, android.os.Bundle().apply {
                putString("scenario", "OFFLINE_CACHED_STARTUP")
                putString("screenshot", screenshot.absolutePath)
            })
        }
    }
}
