package com.ooro.screenplayer

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import androidx.work.*
import com.ooro.screenplayer.sync.SyncWorker
import com.ooro.screenplayer.sync.ProofSyncScheduler
import org.maplibre.android.MapLibre
import org.maplibre.android.WellKnownTileServer
import java.util.concurrent.TimeUnit

class OoroApplication : Application() { override fun onCreate() { super.onCreate(); MapLibre.getInstance(this, "", WellKnownTileServer.MapLibre); val work = WorkManager.getInstance(this); val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(); val request = PeriodicWorkRequestBuilder<SyncWorker>(BuildConfig.HEARTBEAT_INTERVAL_MINUTES.toLong(), TimeUnit.MINUTES).setConstraints(constraints).build(); work.enqueueUniquePeriodicWork("ooro-heartbeat", ExistingPeriodicWorkPolicy.KEEP, request); ProofSyncScheduler.cancelLegacy(this); ProofSyncScheduler.enqueue(this, "application-start"); val cm = getSystemService(ConnectivityManager::class.java); cm.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() { private var lastRecovery = 0L; override fun onAvailable(network: Network) { if (System.currentTimeMillis() - lastRecovery < 30_000) return; lastRecovery = System.currentTimeMillis(); ProofSyncScheduler.enqueue(this@OoroApplication, "network-available") } }) } }
