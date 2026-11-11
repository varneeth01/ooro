package com.ooro.screenplayer

/** Permission UI state only; it never grants or requests permission by itself. */
enum class OptionalLocationState { GRANTED, NOT_REQUESTED, DENIED, PERMANENTLY_DENIED, UNAVAILABLE }

/** Prevents duplicate runtime permission launches while Android's consent UI is in flight. */
class LocationPermissionRequestGate {
    var isInFlight: Boolean = false
        private set

    fun tryBegin(): Boolean {
        if (isInFlight) return false
        isInFlight = true
        return true
    }

    fun complete() {
        isInFlight = false
    }
}

fun optionalLocationState(
    granted: Boolean,
    locationFeatureAvailable: Boolean,
    requestAttempts: Int,
    userDeniedBefore: Boolean,
    shouldShowRationale: Boolean,
    wasGrantedBefore: Boolean = false
): OptionalLocationState = when {
    granted -> OptionalLocationState.GRANTED
    !locationFeatureAvailable -> OptionalLocationState.UNAVAILABLE
    userDeniedBefore && requestAttempts > 0 && !shouldShowRationale && !wasGrantedBefore -> OptionalLocationState.PERMANENTLY_DENIED
    requestAttempts == 0 -> OptionalLocationState.NOT_REQUESTED
    else -> OptionalLocationState.DENIED
}

class LocationPermissionHistory(context: android.content.Context) {
    private val preferences = context.getSharedPreferences("ooro_permission_history", android.content.Context.MODE_PRIVATE)
    val attempts: Int get() = preferences.getInt(KEY_ATTEMPTS, 0)
    val wasGranted: Boolean get() = preferences.getBoolean(KEY_WAS_GRANTED, false)
    val wasDenied: Boolean get() = preferences.getBoolean(KEY_WAS_DENIED, false)
    fun recordRequest() { preferences.edit().putInt(KEY_ATTEMPTS, (attempts + 1).coerceAtMost(100)).apply() }
    fun recordGranted() { if (!wasGranted) preferences.edit().putBoolean(KEY_WAS_GRANTED, true).apply() }
    fun recordDenied() { if (!wasDenied) preferences.edit().putBoolean(KEY_WAS_DENIED, true).apply() }

    companion object {
        const val KEY_ATTEMPTS = "location_request_attempts"
        const val KEY_WAS_GRANTED = "location_was_granted"
        const val KEY_WAS_DENIED = "location_was_denied"
    }
}
