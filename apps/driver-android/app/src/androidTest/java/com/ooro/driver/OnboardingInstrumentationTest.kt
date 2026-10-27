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
import android.content.Context
import com.ooro.driver.data.DriverDatabase
import com.ooro.driver.data.SecureSessionStore
import com.ooro.driver.domain.RideEventType
import com.ooro.driver.notifications.NotificationInput
import com.ooro.driver.notifications.RideEventAdapterRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.Before

class OnboardingInstrumentationTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Before fun resetSyntheticDriverState() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        DriverDatabase.get(context).clearAllTables()
        SecureSessionStore(context).clear()
        context.getSharedPreferences("driver_mock", Context.MODE_PRIVATE).edit().putString("scenario", "SUBMITTED").commit()
        context.getSharedPreferences("ooro_notification_access", Context.MODE_PRIVATE).edit().clear().commit()
        composeRule.activityRule.scenario.onActivity { it.resetSyntheticState() }
        composeRule.waitForIdle()
    }

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

    @Test fun invalidOtpShowsActionableError() {
        composeRule.activityRule.scenario.onActivity { it.seedSyntheticOtp("9876543210") }
        waitForText("Verification code")
        composeRule.onNode(hasSetTextAction()).performTextInput("111111")
        composeRule.onNode(hasText("Verify & continue").and(hasClickAction())).performClick()
        waitForText("Use 000000 in debug mode")
    }

    @Test fun newDriverCanCompleteVisibleRegistrationThroughPendingReview() {
        authenticateForScenario("NEW")
        waitForText("How do you work?")
        composeRule.onNode(hasText("Individual Driver").and(hasClickAction())).performClick()
        waitForText("Your profile")
        composeRule.onNodeWithText("Full name").performTextInput("Test Driver")
        composeRule.onNodeWithText("Email (optional)").performTextInput("test.driver@example.test")
        composeRule.onNodeWithText("City").performTextInput("Bengaluru")
        composeRule.onNode(hasText("Save and continue").and(hasClickAction())).assertIsEnabled().performClick()
        waitForText("Identity and documents")
        composeRule.onNode(hasText("Use controlled test document").and(hasClickAction())).performClick()
        composeRule.onNode(hasText("Upload selected document").and(hasClickAction())).performClick()
        waitForText("Document submitted for review")
        composeRule.onNode(hasText("Continue").and(hasClickAction())).performClick()
        waitForText("Register your vehicle")
        composeRule.onNodeWithText("Registration number").performTextInput("KA01AB1234")
        composeRule.onNodeWithText("Manufacturer").performTextInput("OORO")
        composeRule.onNodeWithText("Model").performTextInput("Driver Cab")
        composeRule.onNode(hasText("Save vehicle").and(hasClickAction())).assertIsEnabled().performClick()
        waitForText("Payout beneficiary")
        composeRule.onNodeWithText("Account or IFSC details").performTextInput("TESTBANK123456")
        composeRule.onNode(hasText("Submit for verification").and(hasClickAction())).assertIsEnabled().performClick()
        waitForText("Review agreements")
        waitForText("Accept this version")
        composeRule.onNode(hasText("Accept this version").and(hasClickAction())).performClick()
        waitForText("Application submitted")
        composeRule.onNode(hasText("Submit application").and(hasClickAction())).performClick()
        waitForText("Application status")
        composeRule.onNodeWithText("SUBMITTED").assertIsDisplayed()
    }

    @Test fun rejectedApplicationShowsReasonAndCorrectionAction() {
        authenticateForScenario("REJECTED")
        waitForText("Application status")
        waitForText("Changes needed: PAN")
        composeRule.onNodeWithText("Document is not readable").assertIsDisplayed()
        composeRule.onNode(hasText("Correct and resubmit").and(hasClickAction())).performClick()
        waitForText("Identity and documents")
    }

    @Test fun approvedDriverWithoutDisplayIsSentToDisplaySetup() {
        authenticateForScenario("APPROVED_NO_DISPLAY")
        waitForText("Which display are you using?")
        composeRule.onNode(hasText("My Own OORO Display").and(hasClickAction())).performClick()
        waitForText("Connect an OORO display")
        composeRule.onNode(hasText("Continue without pairing").and(hasClickAction())).performClick()
        waitForText("Connect your ride tools.")
        composeRule.onNodeWithText("Continue to payment setup").performClick()
        waitForText("Payout beneficiary")
    }

    @Test fun approvedDriverCanNavigateDashboardTabsAndLogout() {
        authenticateForScenario("APPROVED")
        waitForText("Good morning, OORO Demo Driver")
        composeRule.onNodeWithText("Rides").performClick()
        waitForText("Ride activity")
        composeRule.onNodeWithText("Earnings").performClick()
        waitForText("Earnings and payouts")
        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Profile")
        composeRule.onNode(hasText("Log out").and(hasClickAction())).performClick()
        waitForText("Drive with confidence.")
    }

    private fun enterPhoneAndRequestOtp() {
        waitForText("Drive with confidence.")
        composeRule.onNode(hasSetTextAction()).performTextInput("9876543210")
        composeRule.onNode(hasText("Continue securely").and(hasClickAction())).performClick()
        waitForText("Verification code")
    }

    private fun authenticateForScenario(scenario: String) {
        composeRule.activityRule.scenario.onActivity { it.seedSyntheticAuthenticatedScenario(scenario) }
    }

    private fun waitForText(value: String) {
        try {
            composeRule.waitUntil(10_000) { composeRule.onAllNodesWithText(value).fetchSemanticsNodes().isNotEmpty() }
        } catch (error: Throwable) {
            throw AssertionError("Timed out waiting for [$value]", error)
        }
        composeRule.onNodeWithText(value).assertIsDisplayed()
    }
}
