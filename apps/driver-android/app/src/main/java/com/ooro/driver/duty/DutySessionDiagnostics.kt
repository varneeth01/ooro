package com.ooro.driver.duty

import android.location.LocationManager
import android.content.Context

data class DutyDiagnostics(val permissionGranted: Boolean, val preciseLocation: Boolean, val gpsEnabled: Boolean, val tracking: Boolean)
class DutySessionDiagnostics(private val context: Context) {
    fun snapshot(tracking: Boolean): DutyDiagnostics { val permissions = LocationPermissionCoordinator(context); val manager = context.getSystemService(LocationManager::class.java); return DutyDiagnostics(permissions.hasLocationPermission(), permissions.hasPreciseLocation(), manager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true, tracking) }
}
