package com.ooro.driver

import android.content.Intent
import android.provider.Settings
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import com.ooro.driver.domain.RideEventType
import com.ooro.driver.notifications.NotificationInput
import com.ooro.driver.notifications.RideEventAdapterRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class OnboardingInstrumentationTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Test fun loginScreenIsAccessible() {
        composeRule.onNodeWithText("Drive with confidence.").assertIsDisplayed()
        composeRule.onNodeWithText("Mobile number").assertIsDisplayed()
    }

    @Test fun validPhoneEnablesSecureOtpSubmission() {
        composeRule.onNode(hasSetTextAction()).performTextInput("9876543210")
        composeRule.waitForIdle()
        composeRule.onNode(hasText("Continue securely").and(hasClickAction())).assertIsEnabled()
    }

    @Test fun processRecreationRetainsSafeLoginSurface() {
        composeRule.onNodeWithText("Drive with confidence.").assertIsDisplayed()
        composeRule.activityRule.scenario.recreate()
        composeRule.onNodeWithText("Drive with confidence.").assertIsDisplayed()
        composeRule.onNodeWithText("Mobile number").assertIsDisplayed()
    }

    @Test fun notificationAccessSettingsAreResolvableWithoutGrantingAccess() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        assertNotNull(context.packageManager.resolveActivity(intent, 0))
    }

    @Test fun fixtureAdapterNormalizesOnlyTheDebugFixturePackage() {
        val registry = RideEventAdapterRegistry()
        val fixtureEvent = registry.normalize(NotificationInput("com.ooro.driver.notificationfixture", "OORO Fixture", "Fixture ride accepted", 1_000))
        assertEquals("INTERNAL_FIXTURE", fixtureEvent?.provider)
        assertEquals(RideEventType.RIDE_ACCEPTED, fixtureEvent?.eventType)
        assertNull(registry.normalize(NotificationInput("com.ooro.driver.notificationfixture.evil", "Fixture", "Fixture ride accepted", 1_000)))
    }
}
