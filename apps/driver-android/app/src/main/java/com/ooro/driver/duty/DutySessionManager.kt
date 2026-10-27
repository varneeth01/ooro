package com.ooro.driver.duty

import android.content.Context
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.ooro.driver.data.SecureSessionStore
import com.ooro.driver.network.ApiProvider
import com.ooro.driver.network.SecureTokenProvider
import com.ooro.driver.domain.DutySessionSummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID

class DutySessionManager(private val context: Context, private val api: ApiProvider) {
    private val installationId get() = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "ooro-${UUID.randomUUID()}"
    suspend fun start(): DutySessionSummary = withContext(Dispatchers.IO) { require(LocationPermissionCoordinator(context).hasLocationPermission()) { "Location permission is required to start duty" }; val session = api.api.startDuty(installationId, "android-duty-start-${UUID.randomUUID()}"); ContextCompat.startForegroundService(context, DriverDutyLocationService.intent(context, session.id)); session }
    suspend fun stop(session: DutySessionSummary, reason: String = "DRIVER_ENDED"): DutySessionSummary = withContext(Dispatchers.IO) { val ended = api.api.stopDuty(session.id, reason, "android-duty-stop-${UUID.randomUUID()}"); context.stopService(DriverDutyLocationService.intent(context, session.id)); ended }
    companion object { fun forContext(context: Context): DutySessionManager { val store = SecureSessionStore(context); return DutySessionManager(context, ApiProvider(object : SecureTokenProvider { override fun token() = store.get()?.accessToken })) } }
}
