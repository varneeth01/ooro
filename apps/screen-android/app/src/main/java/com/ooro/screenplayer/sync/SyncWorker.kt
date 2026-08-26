package com.ooro.screenplayer.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ooro.screenplayer.api.ApiProvider
import com.ooro.screenplayer.data.DeviceStore
import com.ooro.screenplayer.model.PlayerStatus

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result { val store = DeviceStore(applicationContext); val credentials = store.credentials() ?: return Result.success(); return runCatching { ApiProvider(store).api.heartbeat(credentials, PlayerStatus.READY, 0) }.fold({ Result.success() }, { Result.retry() }) }
}
