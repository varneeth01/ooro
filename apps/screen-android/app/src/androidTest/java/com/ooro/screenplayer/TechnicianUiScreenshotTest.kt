package com.ooro.screenplayer

import android.content.Intent
import android.graphics.BitmapFactory
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.FixMethodOrder
import org.junit.Test
import org.junit.runners.MethodSorters
import org.junit.runner.RunWith

/** Captures production pairing and technician surfaces on an isolated disposable emulator only. */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class TechnicianUiScreenshotTest {
    @Test fun capturesPairingAndAllTechnicianSectionsWithoutPromptOnLaunch() {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        prepareDisposableEmulatorUi(device)
        val output = File(context.getExternalFilesDir(null), "technician-ui-screenshots")
        assertTrue(output.mkdirs() || output.isDirectory)

        ActivityScenario.launch<MainActivity>(Intent(context, MainActivity::class.java)).use {
            dismissImmersiveEducationIfShown(device)
            assertTrue("pairing screen did not appear", device.wait(Until.hasObject(By.textContains("Bring this screen online")), 10_000))
            assertEquals(context.packageName, device.currentPackageName)
            assertTrue("a location dialog appeared without a technician action", device.findObject(By.textContains("Allow OORO Screen Player")) == null)
            capture(device, output, "pairing.png")

            openTechnicianConsole(device)
            assertTrue(device.wait(Until.hasObject(By.textContains("TECHNICIAN CONSOLE")), 5_000))
            assertTrue("Overview refresh control should be available on entry", device.wait(Until.hasObject(By.text("Refresh device status")), 3_000))
            capture(device, output, "overview.png")
            captureSection(device, output, "Playback", "playback.png")
            captureSection(device, output, "Presentation", "presentation.png")
            captureSection(device, output, "Settings", "settings.png")
            assertTrue("initial optional permission state is missing", device.hasObject(By.desc("Location permission status: Not requested")))
            assertTrue("permission action is missing", device.hasObject(By.desc("Request optional location permission")))
            val repairControlsVisible = scrollUntilVisible(device, output)
            assertTrue("technician repair controls are not reachable by scrolling", repairControlsVisible)

            captureOfflineOverview(device, output)
        }
    }

    @Test fun permissionPromptRequiresTechnicianActionAndDenialSurvivesRecreationAndSettingsReturn() {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        prepareDisposableEmulatorUi(device)
        val output = File(context.getExternalFilesDir(null), "technician-ui-screenshots")
        assertTrue(output.mkdirs() || output.isDirectory)
        ActivityScenario.launch<MainActivity>(Intent(context, MainActivity::class.java)).use { scenario ->
            dismissImmersiveEducationIfShown(device)
            assertTrue(device.wait(Until.hasObject(By.textContains("Bring this screen online")), 10_000))
            assertEquals(context.packageName, device.currentPackageName)
            assertTrue(device.findObject(By.textContains("Allow OORO Screen Player")) == null)
            openTechnicianConsole(device)
            clickText(device, "Settings")
            assertTrue(device.wait(Until.hasObject(By.desc("Location permission status: Not requested")), 3_000))
            assertTrue(device.findObject(By.textContains("Allow OORO Screen Player")) == null)

            val requestLocation = device.findObject(By.desc("Request optional location permission"))
            assertNotNull(requestLocation)
            requestLocation!!.click()
            assertTrue("Android consent dialog did not appear after explicit request", device.wait(Until.hasObject(By.textContains("Allow OORO Screen Player")), 8_000))
            assertTrue("requester was not OORO", device.currentPackageName?.contains("permissioncontroller") == true || device.currentPackageName?.contains("permission") == true)
            capture(device, output, "location-consent.png")
            denyLocation(device)
            assertTrue("denial did not return to Screen Player", waitForDeniedState(device))
            capture(device, output, "permission-denied.png")

            // A second explicit denial should move the user to Settings guidance on Android 11+.
            val retry = device.wait(Until.findObject(By.text("TRY LOCATION AGAIN")), 3_000)
            assertNotNull("retry action missing after recoverable denial", retry)
            retry!!.click()
            assertTrue("second consent dialog did not appear after explicit retry", device.wait(Until.hasObject(By.textContains("Allow OORO Screen Player")), 8_000))
            denyLocation(device)
            assertTrue(
                "permanent denial did not offer Android Settings",
                device.wait(Until.hasObject(By.desc("Location permission status: Blocked by Android settings")), 5_000)
            )
            assertTrue("Settings recovery action missing after permanent denial", device.hasObject(By.desc("Open Android app settings to allow location")))
            capture(device, output, "permission-permanently-denied.png")

            scenario.recreate()
            device.waitForIdle()
            assertEquals(context.packageName, device.currentPackageName)
            assertTrue("permission prompt repeated after recreation", device.findObject(By.textContains("Allow OORO Screen Player")) == null)
            clickText(device, "Playback")
            clickText(device, "Settings")
            assertTrue("permission prompt repeated after technician navigation", device.findObject(By.textContains("Allow OORO Screen Player")) == null)

            // Exercise the real Android settings round trip without granting or changing the permission.
            val settingsIntent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(android.net.Uri.fromParts("package", context.packageName, null))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(settingsIntent)
            device.waitForIdle()
            device.pressBack()
            assertTrue("app did not resume after Settings", waitForDeniedState(device))
            assertTrue("permission prompt appeared after Settings return", device.findObject(By.textContains("Allow OORO Screen Player")) == null)
            capture(device, output, "settings-return.png")
        }
    }

    private fun dismissImmersiveEducationIfShown(device: UiDevice) {
        device.wait(Until.findObject(By.text("Got it")), 1_000)?.click()
    }

    private fun openTechnicianConsole(device: UiDevice) {
        repeat(7) {
            assertTrue("technician entry tap failed", device.click(8, 8))
            android.os.SystemClock.sleep(130)
        }
        assertTrue("technician console did not open", device.wait(Until.hasObject(By.textContains("TECHNICIAN CONSOLE")), 5_000))
    }

    private fun clickText(device: UiDevice, text: String) {
        assertTrue("missing technician section: $text", device.wait(Until.hasObject(By.desc("$text section")), 3_000))
        device.findObject(By.desc("$text section")).click()
        device.waitForIdle()
    }

    private fun denyLocation(device: UiDevice) {
        val deny = device.findObject(By.textContains("Don’t allow"))
            ?: device.findObject(By.textContains("Don't allow"))
            ?: device.findObject(By.textContains("DON’T ALLOW"))
            ?: device.findObject(By.textContains("DON'T ALLOW"))
        assertNotNull("Android location denial action not found", deny)
        deny!!.click()
    }

    private fun waitForDeniedState(device: UiDevice): Boolean =
        device.wait(Until.hasObject(By.desc("Location permission status: Not granted")), 1_000) ||
            device.wait(Until.hasObject(By.desc("Location permission status: Blocked by Android settings")), 1_000)

    private fun scrollUntilVisible(device: UiDevice, directory: File): Boolean {
        repeat(8) {
            device.executeShellCommand("input swipe 760 620 760 170 700")
            device.waitForIdle()
        }
        val screenshot = File(directory, "settings-lower.png")
        assertTrue("lower Settings screenshot failed", device.takeScreenshot(screenshot))
        val bitmap = BitmapFactory.decodeFile(screenshot.absolutePath) ?: return false
        val xStart = (bitmap.width * 0.39f).toInt().coerceAtMost(bitmap.width - 1)
        val xEnd = (bitmap.width * 0.58f).toInt().coerceAtMost(bitmap.width)
        val yStart = (bitmap.height * 0.62f).toInt().coerceAtMost(bitmap.height - 1)
        var brandPixels = 0
        for (y in yStart until bitmap.height) for (x in xStart until xEnd) {
            val color = bitmap.getPixel(x, y)
            val red = android.graphics.Color.red(color)
            val green = android.graphics.Color.green(color)
            val blue = android.graphics.Color.blue(color)
            if (red > 180 && green in 130..220 && blue < 60) brandPixels++
        }
        bitmap.recycle()
        return brandPixels > 200
    }

    private fun capture(device: UiDevice, directory: File, name: String) {
        device.waitForIdle()
        val image = File(directory, name)
        assertTrue("screenshot failed: $name", device.takeScreenshot(image))
        assertTrue("empty screenshot: $name", image.length() > 0)
    }

    private fun captureSection(device: UiDevice, directory: File, section: String, screenshot: String) {
        clickText(device, section)
        assertTrue("$section section did not render", device.wait(Until.hasObject(By.text(section.uppercase())), 3_000))
        capture(device, directory, screenshot)
    }

    private fun captureOfflineOverview(device: UiDevice, directory: File) {
        device.executeShellCommand("svc wifi disable")
        device.executeShellCommand("svc data disable")
        try {
            clickText(device, "Overview")
            val refresh = device.wait(Until.findObject(By.textContains("Refresh device status")), 12_000)
            assertNotNull("overview refresh action did not become available", refresh)
            refresh!!.click()
            assertTrue("offline status was not reflected", device.wait(Until.hasObject(By.text("Offline")), 12_000))
            capture(device, directory, "offline.png")
        } finally {
            device.executeShellCommand("svc wifi enable")
            device.executeShellCommand("svc data enable")
        }
    }
}
