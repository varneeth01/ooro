package com.ooro.screenplayer

import android.app.Application
import androidx.work.*
import com.ooro.screenplayer.sync.SyncWorker
import java.util.concurrent.TimeUnit

class OoroApplication : Application() { override fun onCreate() { super.onCreate(); val request = PeriodicWorkRequestBuilder<SyncWorker>(BuildConfig.HEARTBEAT_INTERVAL_MINUTES.toLong(), TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build(); WorkManager.getInstance(this).enqueueUniquePeriodicWork("ooro-device-sync", ExistingPeriodicWorkPolicy.KEEP, request) } }
