package com.ooro.screenplayer.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.ooro.screenplayer.MainActivity

/**
 * The HOME intent filter is the primary launch mechanism. This receiver gives
 * Android a second chance to open OORO after user-unlocked boot or app update.
 *
 * Do not gate startup on pairing: an unpaired display needs the OORO setup UI.
 * Avoid launching during LOCKED_BOOT_COMPLETED because app credential storage
 * may be locked, and don't interfere with other launcher selections.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return

        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val defaultHome = context.packageManager.resolveActivity(home, 0)?.activityInfo?.packageName
        if (defaultHome != context.packageName) return

        val launch = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        try {
            context.startActivity(launch)
        } catch (error: RuntimeException) {
            // Android may restrict activity starts from a background receiver.
            // The system will still launch the selected HOME activity normally.
            Log.w("OoroScreen", "HOME start deferred to Android launcher", error)
        }
    }
}
