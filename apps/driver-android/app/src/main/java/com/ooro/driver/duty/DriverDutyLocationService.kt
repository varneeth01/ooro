package com.ooro.driver.duty

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.ooro.driver.R
import com.ooro.driver.data.DriverDatabase
import com.ooro.driver.data.SecureSessionStore
import com.ooro.driver.network.ApiProvider
import com.ooro.driver.network.SecureTokenProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID

class DriverDutyLocationService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var callback: LocationCallback? = null
    private var sessionId: String? = null
    override fun onCreate() { super.onCreate(); getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(CHANNEL, "OORO duty location", NotificationManager.IMPORTANCE_LOW)) }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int { sessionId = intent?.getStringExtra(EXTRA_SESSION_ID) ?: sessionId; if (intent?.action == ACTION_END) { val id = sessionId; if (id == null) { stopTracking(); stopSelf() } else scope.launch { runCatching { val store = SecureSessionStore(this@DriverDutyLocationService); ApiProvider(object : SecureTokenProvider { override fun token() = store.get()?.accessToken }).api.stopDuty(id, "NOTIFICATION_ENDED", "android-notification-stop-${System.currentTimeMillis()}") }; stopTracking(); stopSelf() }; return START_NOT_STICKY }; if (sessionId == null || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) { stopSelf(); return START_NOT_STICKY }; startForeground(ID, notification()); startTracking(); return START_NOT_STICKY }
    private fun startTracking() { if (callback != null) return; val interval = if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) 30_000L else 60_000L; val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, interval).setMinUpdateIntervalMillis(interval / 2).setMaxUpdateDelayMillis(interval * 2).build(); callback = object : LocationCallback() { override fun onLocationResult(result: LocationResult) { val id = sessionId ?: return; val db = DriverDatabase.get(this@DriverDutyLocationService); scope.launch { result.locations.forEach { db.dutyLocations().add(com.ooro.driver.data.DutyLocationEntity(UUID.randomUUID().toString(), id, Instant.ofEpochMilli(it.time).toString(), it.latitude, it.longitude, it.accuracy, if (it.hasSpeed()) it.speed else null, if (it.hasBearing()) it.bearing else null)) } } } }; LocationServices.getFusedLocationProviderClient(this).requestLocationUpdates(request, callback!!, mainLooper) }
    private fun stopTracking() { callback?.let { LocationServices.getFusedLocationProviderClient(this).removeLocationUpdates(it) }; callback = null }
    private fun notification(): Notification = NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("OORO duty is active").setContentText("Location sharing is on for this duty session").setOngoing(true).addAction(NotificationCompat.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "End duty", PendingIntent.getService(this, 901, Intent(this, DriverDutyLocationService::class.java).setAction(ACTION_END).putExtra(EXTRA_SESSION_ID, sessionId).setPackage(packageName), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)).build()).build()
    override fun onDestroy() { stopTracking(); scope.coroutineContext.cancel(); super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object { private const val CHANNEL = "ooro-duty-location"; private const val ID = 7101; private const val ACTION_END = "com.ooro.driver.END_DUTY"; private const val EXTRA_SESSION_ID = "session_id"; fun intent(context: Context, sessionId: String) = Intent(context, DriverDutyLocationService::class.java).putExtra(EXTRA_SESSION_ID, sessionId) }
}
