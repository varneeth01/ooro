package com.ooro.driver.notifications

import android.content.Context

class NotificationAccessPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("ooro_notification_access", Context.MODE_PRIVATE)
    fun isActivated(): Boolean = prefs.getBoolean(KEY_ACTIVATED, false)
    fun setActivated(value: Boolean) { prefs.edit().putBoolean(KEY_ACTIVATED, value).apply() }
    fun isProviderEnabled(provider: String): Boolean = prefs.getBoolean("provider_$provider", false)
    fun setProviderEnabled(provider: String, value: Boolean) { prefs.edit().putBoolean("provider_$provider", value).apply() }
    companion object { private const val KEY_ACTIVATED = "activated" }
}
