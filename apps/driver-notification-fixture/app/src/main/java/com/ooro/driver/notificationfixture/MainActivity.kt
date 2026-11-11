package com.ooro.driver.notificationfixture

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

private const val CHANNEL_ID = "ooro-fixture-rides"
private const val NOTIFICATION_ID = 7001
private const val SECOND_NOTIFICATION_ID = 7002

class MainActivity : Activity() {
    private lateinit var manager: NotificationManager
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Fixture ride events", NotificationManager.IMPORTANCE_HIGH))
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(32, 32, 32, 32) }
        root.addView(TextView(this).apply { text = "OORO internal notification fixture\nSynthetic only — never a provider impersonation"; textSize = 18f }, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        listOf(
            "Booking offered" to "Fixture booking offered",
            "Accepted" to "Fixture ride accepted",
            "Pickup" to "Fixture pickup",
            "Started" to "Fixture ride started",
            "Completed" to "Fixture ride completed",
            "Cancelled" to "Fixture ride cancelled",
            "Destination unknown" to "Fixture ride accepted · destination unavailable",
            "Missing fields" to "Fixture ride update",
            "Duplicate" to "Fixture ride accepted"
        ).forEach { (label, text) -> root.addView(Button(this).apply { this.text = label; setOnClickListener { postRide(text) } }, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT) }
        root.addView(Button(this).apply { text = "Delayed event"; setOnClickListener { postRide("Fixture delayed ride update", System.currentTimeMillis() - 120_000L) } }, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(Button(this).apply { text = "Reordered pair"; setOnClickListener { postRide("Fixture ride completed", id = SECOND_NOTIFICATION_ID); postRide("Fixture ride started", id = NOTIFICATION_ID) } }, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(Button(this).apply { text = "Remove notification"; setOnClickListener { manager.cancel(NOTIFICATION_ID) } }, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        setContentView(root)
    }

    private fun postRide(text: String, whenMillis: Long = System.currentTimeMillis(), id: Int = NOTIFICATION_ID) {
        val notification = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(this, CHANNEL_ID) else android.app.Notification.Builder(this)
        notification.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("OORO Fixture").setContentText(text).setWhen(whenMillis).setAutoCancel(false)
        manager.notify(id, notification.build())
    }
}
