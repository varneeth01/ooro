package com.ooro.screenplayer.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ooro.screenplayer.MainActivity
import com.ooro.screenplayer.data.DeviceStore

class BootReceiver : BroadcastReceiver() { override fun onReceive(context: Context, intent: Intent) { if (intent.action == Intent.ACTION_BOOT_COMPLETED && DeviceStore(context).credentials() != null) context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)) } }
