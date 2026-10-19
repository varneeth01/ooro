package com.ooro.deviceagent.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ooro.deviceagent.sync.WorkScheduler

class BootReceiver : BroadcastReceiver() { override fun onReceive(context: Context, intent: Intent) { if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) WorkScheduler.enqueue(context) } }
