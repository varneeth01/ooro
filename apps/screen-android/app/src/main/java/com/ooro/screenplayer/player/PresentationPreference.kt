package com.ooro.screenplayer.player

import android.content.Context

/** Local presentation override. This value must never alter manifest authorization or proof data. */
enum class PresentationPreference {
    AUTO_FROM_MANIFEST,
    OORO_V3_PRESENTATION
}

fun geometryContractVersion(manifestVersion: Int, layout: com.ooro.screenplayer.model.DisplayLayout, preference: PresentationPreference): Int =
    if (preference == PresentationPreference.OORO_V3_PRESENTATION &&
        layout in setOf(com.ooro.screenplayer.model.DisplayLayout.FOUR_ZONE, com.ooro.screenplayer.model.DisplayLayout.AD_NAV_OFFER)
    ) 3 else manifestVersion

class PresentationPreferenceStore(context: Context) {
    private val preferences = context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    fun read(): PresentationPreference = runCatching {
        PresentationPreference.valueOf(preferences.getString(KEY, null) ?: PresentationPreference.AUTO_FROM_MANIFEST.name)
    }.getOrDefault(PresentationPreference.AUTO_FROM_MANIFEST)

    fun write(value: PresentationPreference) {
        preferences.edit().putString(KEY, value.name).apply()
    }

    companion object {
        const val FILE_NAME = "ooro_presentation"
        const val KEY = "presentation_preference"
    }
}
