package com.ooro.screenplayer

import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LayoutStudioRendererScreenshotTest {
    @Test fun capturesSyntheticCustomLayoutWithoutNetworkOrProofDependencies() {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        ActivityScenario.launch<LayoutStudioPreviewActivity>(Intent(context, LayoutStudioPreviewActivity::class.java)).use {
            val device = UiDevice.getInstance(instrumentation)
            val width = device.displayWidth
            val height = device.displayHeight
            for (id in listOf("hero", "sponsor", "qr", "nav")) assertTrue("Missing native custom zone $id", device.wait(androidx.test.uiautomator.Until.hasObject(By.desc("LayoutStudioZone:$id")), 5_000))
            assertBounds(device, "hero", 0, 0, (width * .8f).toInt(), (height * .85f).toInt())
            assertBounds(device, "sponsor", 0, (height * .85f).toInt(), (width * .8f).toInt(), height)
            assertBounds(device, "qr", (width * .8f).toInt(), 0, width, height / 2)
            assertBounds(device, "nav", (width * .8f).toInt(), height / 2, width, height)
            device.waitForIdle()
            val directory = File(context.getExternalFilesDir(null), "layout-studio-screenshots")
            assertTrue(directory.mkdirs() || directory.isDirectory)
            val output = File(directory, "custom-layout-native-preview.png")
            assertTrue(device.takeScreenshot(output))
            assertTrue(output.length() > 0)
            instrumentation.sendStatus(0, android.os.Bundle().apply { putString("screenshot", output.absolutePath); putString("proofs", "disabled") })
        }
    }

    private fun assumeDisposableEmulator() = com.ooro.screenplayer.assumeDisposableEmulator()

    private fun assertBounds(device: UiDevice, id: String, left: Int, top: Int, right: Int, bottom: Int) {
        val rect = device.findObject(By.desc("LayoutStudioZone:$id"))?.visibleBounds
        assertTrue("Missing bounds for $id", rect != null)
        val actual = requireNotNull(rect)
        assertTrue("$id left=$actual expected=$left", kotlin.math.abs(actual.left - left) <= 2)
        assertTrue("$id top=$actual expected=$top", kotlin.math.abs(actual.top - top) <= 2)
        assertTrue("$id right=$actual expected=$right", kotlin.math.abs(actual.right - right) <= 2)
        assertTrue("$id bottom=$actual expected=$bottom", kotlin.math.abs(actual.bottom - bottom) <= 2)
    }
}
