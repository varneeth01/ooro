package com.ooro.screenplayer

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import androidx.work.*
import com.ooro.screenplayer.sync.SyncWorker
import java.util.concurrent.TimeUnit

class OoroApplication : Application() { override fun onCreate() { super.onCreate(); val work = WorkManager.getInstance(this); val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(); val request = PeriodicWorkRequestBuilder<SyncWorker>(BuildConfig.HEARTBEAT_INTERVAL_MINUTES.toLong(), TimeUnit.MINUTES).setConstraints(constraints).build(); work.enqueueUniquePeriodicWork("ooro-heartbeat", ExistingPeriodicWorkPolicy.KEEP, request); val startup = OneTimeWorkRequestBuilder<SyncWorker>().build(); work.enqueueUniqueWork("ooro-startup-sync", ExistingWorkPolicy.REPLACE, startup); val cm = getSystemService(ConnectivityManager::class.java); cm.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() { private var lastRecovery = 0L; override fun onAvailable(network: Network) { if (System.currentTimeMillis() - lastRecovery < 30_000) return; lastRecovery = System.currentTimeMillis(); val oneShot = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build(); work.enqueueUniqueWork("ooro-connectivity-recovery", ExistingWorkPolicy.KEEP, oneShot) } }) } }
