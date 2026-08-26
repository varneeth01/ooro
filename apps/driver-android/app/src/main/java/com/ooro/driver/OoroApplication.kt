package com.ooro.driver

import android.app.Application
import androidx.work.*
import com.ooro.driver.sync.DriverSyncWorker
import java.util.concurrent.TimeUnit

class OoroApplication : Application() { override fun onCreate() { super.onCreate(); val request = PeriodicWorkRequestBuilder<DriverSyncWorker>(15, TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build(); WorkManager.getInstance(this).enqueueUniquePeriodicWork("ooro-driver-sync", ExistingPeriodicWorkPolicy.KEEP, request) } }
