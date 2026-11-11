package com.ooro.screenplayer

import org.junit.Assert.assertEquals
import org.junit.Test

class TechnicianStateSubscriptionsTest {
    @Test fun overviewObservesOnlyVisibleStatusAndPlaybackState() {
        assertEquals(
            TechnicianStateSubscriptions(diagnostics = true, playback = true, mapHealth = false),
            technicianStateSubscriptions(TechnicianSection.OVERVIEW),
        )
    }

    @Test fun playbackObservesPlaybackAndDiagnosticsButNotMapHealth() {
        assertEquals(
            TechnicianStateSubscriptions(diagnostics = true, playback = true, mapHealth = false),
            technicianStateSubscriptions(TechnicianSection.PLAYBACK),
        )
    }

    @Test fun presentationDoesNotSubscribeToChangingDeviceState() {
        assertEquals(
            TechnicianStateSubscriptions(diagnostics = false, playback = false, mapHealth = false),
            technicianStateSubscriptions(TechnicianSection.PRESENTATION),
        )
    }

    @Test fun settingsObservesDiagnosticsAndMapHealthWithoutPlaybackState() {
        assertEquals(
            TechnicianStateSubscriptions(diagnostics = true, playback = false, mapHealth = true),
            technicianStateSubscriptions(TechnicianSection.SETTINGS),
        )
    }
}
