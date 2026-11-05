package com.ooro.screenplayer

/** Permission UI state only; it never grants or requests permission by itself. */
enum class OptionalLocationState { GRANTED, DENIED, PERMANENTLY_DENIED, UNAVAILABLE }

fun optionalLocationState(
    granted: Boolean,
    locationFeatureAvailable: Boolean,
    requestAttempts: Int,
    shouldShowRationale: Boolean,
    wasGrantedBefore: Boolean = false
): OptionalLocationState = when {
    granted -> OptionalLocationState.GRANTED
    !locationFeatureAvailable -> OptionalLocationState.UNAVAILABLE
    requestAttempts > 0 && !shouldShowRationale && !wasGrantedBefore -> OptionalLocationState.PERMANENTLY_DENIED
    else -> OptionalLocationState.DENIED
}

class LocationPermissionHistory(context: android.content.Context) {
    private val preferences = context.getSharedPreferences("ooro_permission_history", android.content.Context.MODE_PRIVATE)
    val attempts: Int get() = preferences.getInt(KEY_ATTEMPTS, 0)
    val wasGranted: Boolean get() = preferences.getBoolean(KEY_WAS_GRANTED, false)
    fun recordRequest() { preferences.edit().putInt(KEY_ATTEMPTS, (attempts + 1).coerceAtMost(100)).apply() }
    fun recordGranted() { preferences.edit().putBoolean(KEY_WAS_GRANTED, true).apply() }

    companion object { const val KEY_ATTEMPTS = "location_request_attempts"; const val KEY_WAS_GRANTED = "location_was_granted" }
}
