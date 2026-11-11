package com.ooro.screenplayer

import com.ooro.screenplayer.player.PresentationPreference
import com.ooro.screenplayer.player.PresentationPreferenceStore
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class PresentationPreferenceTest {
    @Test fun defaultsToManifestAndPersistsExplicitLocalOverride() {
        val context = RuntimeEnvironment.getApplication()
        context.getSharedPreferences(PresentationPreferenceStore.FILE_NAME, 0).edit().clear().commit()
        val firstStore = PresentationPreferenceStore(context)
        assertEquals(PresentationPreference.AUTO_FROM_MANIFEST, firstStore.read())

        firstStore.write(PresentationPreference.OORO_V3_PRESENTATION)
        assertEquals(PresentationPreference.OORO_V3_PRESENTATION, PresentationPreferenceStore(context).read())

        firstStore.write(PresentationPreference.AUTO_FROM_MANIFEST)
        assertEquals(PresentationPreference.AUTO_FROM_MANIFEST, PresentationPreferenceStore(context).read())
    }

    @Test fun unknownPersistedValueSafelyFallsBackToManifest() {
        val context = RuntimeEnvironment.getApplication()
        context.getSharedPreferences(PresentationPreferenceStore.FILE_NAME, 0).edit()
            .putString(PresentationPreferenceStore.KEY, "UNRECOGNIZED")
            .commit()
        assertEquals(PresentationPreference.AUTO_FROM_MANIFEST, PresentationPreferenceStore(context).read())
    }
}
