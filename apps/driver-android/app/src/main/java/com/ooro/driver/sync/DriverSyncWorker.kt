package com.ooro.driver.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ooro.driver.data.DriverDatabase
import com.ooro.driver.data.SecureSessionStore
import com.ooro.driver.network.ApiProvider

class DriverSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result { val db = DriverDatabase.get(applicationContext); val session = SecureSessionStore(applicationContext); if (session.get() == null) return Result.success(); return runCatching { ApiProvider(object : com.ooro.driver.network.SecureTokenProvider { override fun token() = session.get()?.accessToken }).api; db.rides().pendingEvents(50); db.locations().pending(50); db.proofs().pending(50) }.fold({ Result.success() }, { Result.retry() }) }
}
