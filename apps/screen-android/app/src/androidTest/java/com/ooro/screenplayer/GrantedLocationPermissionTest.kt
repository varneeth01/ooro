package com.ooro.screenplayer

import android.content.Intent
import android.os.Build
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Exercises a granted optional permission on an isolated AVD; run separately because it changes package permission state. */
@RunWith(AndroidJUnit4::class)
class GrantedLocationPermissionTest {
    @Test fun grantedLocationShowsCurrentStateWithoutLaunchingConsentDialog() {
        assumeTrue(Build.PRODUCT.startsWith("sdk_", ignoreCase = true) || Build.DEVICE.startsWith("emu", ignoreCase = true))
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        instrumentation.uiAutomation.grantRuntimePermission(context.packageName, android.Manifest.permission.ACCESS_COARSE_LOCATION)
        ActivityScenario.launch<MainActivity>(Intent(context, MainActivity::class.java)).use { scenario ->
            device.wait(Until.findObject(By.text("Got it")), 1_000)?.click()
            assertTrue(device.wait(Until.hasObject(By.textContains("Bring this screen online")), 8_000))
            repeat(7) { device.click(8, 8); android.os.SystemClock.sleep(130) }
            assertTrue(device.wait(Until.hasObject(By.textContains("TECHNICIAN CONSOLE")), 5_000))
            val settings = device.findObject(By.desc("Settings section"))
            assertTrue(settings != null)
            settings!!.click()
            assertTrue(device.wait(Until.hasObject(By.desc("Location permission status: Allowed")), 5_000))
            assertFalse("granted permission showed a runtime prompt", device.hasObject(By.textContains("Allow OORO Screen Player")))
            scenario.recreate()
            device.waitForIdle()
            assertEquals(context.packageName, device.currentPackageName)
            assertFalse("recreation repeated a permission prompt", device.hasObject(By.textContains("Allow OORO Screen Player")))
        }
    }
}
