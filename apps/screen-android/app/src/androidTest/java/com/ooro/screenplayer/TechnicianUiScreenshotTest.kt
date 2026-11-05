package com.ooro.screenplayer

import android.content.Intent
import android.os.Build
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
import org.junit.Assume.assumeTrue
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
            capture(device, output, "overview.png")
            captureSection(device, output, "Playback", "playback.png")
            captureSection(device, output, "Presentation", "presentation.png")
            captureSection(device, output, "Settings", "settings.png")
            repeat(4) {
                if (!device.hasObject(By.text("PAIRING & RECOVERY"))) {
                    device.swipe(900, 650, 900, 150, 24)
                    device.waitForIdle()
                }
            }
            assertTrue("technician repair controls are not reachable by scrolling", device.hasObject(By.text("PAIRING & RECOVERY")))
            capture(device, output, "settings-lower.png")
            repeat(4) {
                if (!device.hasObject(By.desc("Location permission status: Not requested"))) {
                    device.swipe(900, 150, 900, 650, 24)
                    device.waitForIdle()
                }
            }
            assertTrue("initial optional permission state is missing", device.hasObject(By.desc("Location permission status: Not requested")))
            assertTrue("permission action is missing", device.hasObject(By.desc("Request optional location permission")))

            captureOfflineOverview(device, output)
            clickText(device, "Settings")
            assertTrue("return to Settings failed after offline view", device.wait(Until.hasObject(By.text("SETTINGS")), 3_000))
        }
    }

    @Test fun permissionPromptRequiresTechnicianActionAndDenialSurvivesRecreationAndSettingsReturn() {
        assumeDisposableEmulator()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
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

    private fun assumeDisposableEmulator() {
        assumeTrue("This permission-mutating test must run on an emulator", Build.FINGERPRINT.contains("generic", ignoreCase = true) || Build.MODEL.contains("emulator", ignoreCase = true) || Build.PRODUCT.startsWith("sdk_", ignoreCase = true) || Build.DEVICE.startsWith("emu", ignoreCase = true))
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
