package com.ooro.driver.rides

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.ooro.driver.R

class OoroRideForegroundService : Service() {
    override fun onCreate() { super.onCreate(); getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(CHANNEL, "OORO ride status", NotificationManager.IMPORTANCE_LOW)) }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int { startForeground(ID, notification(intent?.getStringExtra("state") ?: "Ride active")); return START_STICKY }
    override fun onBind(intent: Intent?): IBinder? = null
    private fun notification(state: String): Notification = NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("OORO Driver").setContentText(state).setOngoing(true).build()
    companion object { private const val CHANNEL = "ooro-ride"; private const val ID = 7001 }
}
