package com.ooro.deviceagent.kiosk

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context

class DeviceOsAdminReceiver : DeviceAdminReceiver() {
    companion object { fun component(context: Context) = ComponentName(context, DeviceOsAdminReceiver::class.java); fun isDeviceOwner(context: Context) = context.getSystemService(DevicePolicyManager::class.java).isDeviceOwnerApp(context.packageName) }
}
