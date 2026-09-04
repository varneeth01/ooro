package com.ooro.screenplayer.kiosk

import android.app.Activity
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build

class OoroDeviceAdminReceiver : DeviceAdminReceiver() {
    companion object {
        fun component(context: Context) = ComponentName(context, OoroDeviceAdminReceiver::class.java)
        fun isOwner(context: Context): Boolean = context.getSystemService(DevicePolicyManager::class.java).isDeviceOwnerApp(context.packageName)
        fun initialize(context: Context, activity: Activity) {
            val dpm = context.getSystemService(DevicePolicyManager::class.java)
            if (!dpm.isDeviceOwnerApp(context.packageName)) return
            runCatching {
                dpm.setLockTaskPackages(component(context), arrayOf(context.packageName))
                if (Build.VERSION.SDK_INT >= 28) dpm.setLockTaskFeatures(component(context), DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                dpm.setKeyguardDisabled(component(context), true)
                activity.startLockTask()
            }
        }
    }
}
