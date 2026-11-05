package com.ooro.screenplayer

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.content.Intent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

/** Launch and recreation must not prompt for optional location access. */
@RunWith(AndroidJUnit4::class)
class PermissionLaunchTest {
    @Test fun coldLaunchAndActivityRecreationDoNotOpenPermissionDialog() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        val launchIntent = Intent(instrumentation.targetContext, MainActivity::class.java)
        ActivityScenario.launch<MainActivity>(launchIntent).use { scenario ->
            device.waitForIdle()
            assertEquals(instrumentation.targetContext.packageName, device.currentPackageName)
            assertFalse(device.hasObject(By.textContains("Allow")))
            scenario.recreate()
            device.waitForIdle()
            assertEquals(instrumentation.targetContext.packageName, device.currentPackageName)
            assertFalse(device.hasObject(By.textContains("Allow")))
        }
    }
}
