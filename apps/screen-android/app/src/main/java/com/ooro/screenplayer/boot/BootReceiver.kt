package com.ooro.screenplayer.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log

/**
 * Observe boot and package replacement without starting a second, ordinary
 * MainActivity task. Android's HOME task lifecycle is responsible for opening
 * the selected launcher; a background receiver cannot substitute for it.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return

        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val selectedHome = context.packageManager
            .resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName
        Log.i(
            "OoroScreen",
            "startup event=${intent.action} selectedHome=${selectedHome ?: "unknown"}; " +
                "leaving activity launch to Android HOME resolution"
        )
    }
}
