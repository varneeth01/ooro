package com.ooro.screenplayer

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.content.Intent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Launch and recreation must not prompt for optional location access. */
@RunWith(AndroidJUnit4::class)
class PermissionLaunchTest {
    @Test fun coldLaunchAndActivityRecreationDoNotOpenPermissionDialog() {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        val launchIntent = Intent(instrumentation.targetContext, MainActivity::class.java)
        ActivityScenario.launch<MainActivity>(launchIntent).use { scenario ->
            dismissImmersiveEducationIfShown(device)
            assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(By.textContains("Bring this screen online")), 8_000))
            device.waitForIdle()
            assertEquals(instrumentation.targetContext.packageName, device.currentPackageName)
            assertFalse(device.hasObject(By.textContains("Allow OORO Screen Player")))
            scenario.recreate()
            dismissImmersiveEducationIfShown(device)
            assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(By.textContains("Bring this screen online")), 8_000))
            device.waitForIdle()
            assertEquals(instrumentation.targetContext.packageName, device.currentPackageName)
            assertFalse(device.hasObject(By.textContains("Allow OORO Screen Player")))
        }
    }

    @Test fun returningFromAndroidHomeAndOpeningPlayerDoesNotPrompt() {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        val launchIntent = Intent(instrumentation.targetContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<MainActivity>(launchIntent).use {
            dismissImmersiveEducationIfShown(device)
            assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(By.textContains("Bring this screen online")), 8_000))
            device.pressHome()
            instrumentation.startActivitySync(launchIntent)
            assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(By.textContains("Bring this screen online")), 8_000))
            assertEquals(instrumentation.targetContext.packageName, device.currentPackageName)
            assertFalse(device.hasObject(By.textContains("Allow OORO Screen Player")))
        }
    }

    private fun dismissImmersiveEducationIfShown(device: UiDevice) {
        device.wait(androidx.test.uiautomator.Until.findObject(By.text("Got it")), 1_000)?.click()
    }

}
