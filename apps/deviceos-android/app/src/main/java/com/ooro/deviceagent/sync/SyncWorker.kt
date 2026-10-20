package com.ooro.deviceagent.sync

import android.content.Context
import android.app.ActivityManager
import android.content.pm.PackageInfo
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.StatFs
import androidx.work.*
import com.ooro.deviceagent.data.AgentDatabaseProvider
import com.ooro.deviceagent.data.InstallStateEntity
import com.ooro.deviceagent.data.SecureStore
import com.ooro.deviceagent.install.ApkInstaller
import com.ooro.deviceagent.install.installedPackageCertificateSha256
import com.ooro.deviceagent.install.installedPackageMatches
import com.ooro.deviceagent.install.validateApk
import com.ooro.deviceagent.model.DeviceCredentials
import com.ooro.deviceagent.network.DeviceOsApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    private val store = SecureStore(context)
    private val db = AgentDatabaseProvider.get(context)
    private val api = DeviceOsApi()
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val credentials = store.credentials() ?: return@withContext Result.success()
        runCatching {
            val targets = api.state(credentials)
            val inventory = inventoryJson(applicationContext)
            api.heartbeat(credentials, inventory, capabilities(applicationContext))
            for (target in targets) process(credentials, target)
            Result.success()
        }.getOrElse { error ->
            if (isCredentialTerminal(error)) {
                store.clear()
                Result.success()
            } else if (runAttemptCount < 5) Result.retry() else Result.failure()
        }
    }
    private suspend fun process(credentials: DeviceCredentials, target: com.ooro.deviceagent.model.DeploymentTarget) {
        if (deploymentWorkDeferred(target.campaignState)) return
        target.nextAttemptAt?.let { runCatching { java.time.Instant.parse(it) }.getOrNull()?.let { next -> if (next.isAfter(java.time.Instant.now())) return } }
        if (target.release.packageName == "com.ooro.screenplayer" && !withinMaintenanceWindow(target.maintenanceWindowStart, target.maintenanceWindowEnd)) return
        val dao = db.installStates(); val existing = dao.get(target.id); val id = "${target.id}:${target.attemptNumber}"
        val retryingLocalFailure = reopensLocalFailureForRetry(existing?.state.orEmpty(), target.state)
        if (target.state == "RETRY_WAIT") {
            api.report(credentials, target.id, "ASSIGNED", "$id:assigned")
            if (retryingLocalFailure) dao.put(InstallStateEntity(target.id, "ASSIGNED", localPath = existing?.localPath))
        }
        if (existing?.state == "HEALTHY") return
        if (existing?.state == "PENDING_USER_ACTION") {
            runCatching {
                api.report(credentials, target.id, "PENDING_USER_ACTION", "$id:pending-user-action", JSONObject().put("installerStatus", "PENDING_USER_ACTION").put("installerMessage", existing.error ?: "User action is required to complete installation"))
            }.onFailure { if (isCredentialTerminal(it)) store.clear() }
            return
        }
        if (existing?.state == "FAILED" && !retryingLocalFailure) {
            if (target.state == "FAILED" || target.state == "RETRY_WAIT") return
            val errorCode = existing.error ?: "INSTALL_FAILED"
            runCatching {
                api.report(credentials, target.id, "FAILED", "$id:installer-failed", JSONObject().put("errorCode", errorCode).put("errorMessage", errorCode).put("installerStatus", errorCode))
            }.onFailure { if (isCredentialTerminal(it)) store.clear() }
            return
        }
        if (existing?.state == "INSTALLED" && target.state in setOf("INSTALLING", "PENDING_USER_ACTION")) {
            runCatching {
                api.report(credentials, target.id, "INSTALLED", "$id:installed", JSONObject().put("installerStatus", "SUCCESS"))
            }.onFailure { if (isCredentialTerminal(it)) store.clear() }
        }
        if (existing?.state == "INSTALLING") {
            val sessionInfo = existing.sessionId?.let { runCatching { applicationContext.packageManager.packageInstaller.getSessionInfo(it) }.getOrNull() }
            if (sessionInfo?.isActive == true) return
            if (installedPackageMatches(applicationContext, target.release)) {
                dao.put(InstallStateEntity(target.id, "INSTALLED", existing.sessionId, existing.localPath))
                runCatching { api.report(credentials, target.id, "INSTALLED", "$id:recovered-installed", JSONObject().put("installerStatus", "RECOVERED_AFTER_RESTART").put("installedVersionCode", target.release.versionCode)) }.onFailure { if (isCredentialTerminal(it)) store.clear() }
            } else {
                val errorCode = if (sessionInfo == null) "INSTALL_SESSION_MISSING" else "INSTALL_SESSION_INACTIVE"
                dao.put(InstallStateEntity(target.id, "FAILED", existing.sessionId, existing.localPath, error = errorCode))
                runCatching { api.report(credentials, target.id, "FAILED", "$id:recovered-failed", JSONObject().put("errorCode", errorCode).put("installerStatus", errorCode)) }.onFailure { if (isCredentialTerminal(it)) store.clear() }
            }
            return
        }
        if (existing == null && installedPackageMatches(applicationContext, target.release)) {
            dao.put(InstallStateEntity(target.id, "HEALTH_CHECK"))
            api.report(credentials, target.id, "HEALTH_CHECK", "$id:already-compliant", JSONObject().put("healthStatus", "HEALTHY").put("installedVersionCode", target.release.versionCode).put("installedCertificateSha256", installedPackageCertificateSha256(applicationContext, target.release.packageName)).put("installerStatus", "ALREADY_COMPLIANT"))
            dao.put(InstallStateEntity(target.id, "HEALTHY"))
            api.report(credentials, target.id, "HEALTHY", "$id:already-healthy", JSONObject().put("healthStatus", "HEALTHY").put("installedVersionCode", target.release.versionCode).put("installerStatus", "ALREADY_COMPLIANT"))
            return
        }
        if (existing?.state == "INSTALLED" || existing?.state == "HEALTH_CHECK") {
            api.report(credentials, target.id, "HEALTH_CHECK", "$id:health-check")
            val packageInfo = runCatching { applicationContext.packageManager.getPackageInfo(target.release.packageName, 0) }.getOrNull()
            val installedVersion = packageInfo?.let { if (android.os.Build.VERSION.SDK_INT >= 28) it.longVersionCode else @Suppress("DEPRECATION") it.versionCode.toLong() }
            if (installedVersion != null && installedPackageMatches(applicationContext, target.release)) {
                dao.put(InstallStateEntity(target.id, "HEALTHY", localPath = existing.localPath)); api.report(credentials, target.id, "HEALTHY", "$id:healthy", org.json.JSONObject().put("healthStatus", "HEALTHY").put("installedVersionCode", installedVersion).put("installedCertificateSha256", installedPackageCertificateSha256(applicationContext, target.release.packageName)))
            } else {
                dao.put(InstallStateEntity(target.id, "FAILED", localPath = existing.localPath, error = "HEALTH_CHECK_VERSION_MISMATCH")); api.report(credentials, target.id, "FAILED", "$id:health-failed", org.json.JSONObject().put("errorCode", "HEALTH_CHECK_VERSION_MISMATCH").put("healthStatus", "FAILED"))
            }
            return
        }
        val dir = File(applicationContext.filesDir, "deviceos-apks").apply { mkdirs() }; val apk = File(dir, "${target.release.id}.apk")
        try {
            if (existing?.state != "DOWNLOADED" && existing?.state != "VERIFIED" && existing?.state != "INSTALLING") {
                dao.put(InstallStateEntity(target.id, "DOWNLOADING", localPath = apk.absolutePath)); api.report(credentials, target.id, "DOWNLOADING", "$id:downloading")
                val free = StatFs(applicationContext.filesDir.absolutePath).availableBytes
                if (free < target.release.sizeBytes * 2) error("INSUFFICIENT_STORAGE")
                api.download(credentials, target.release.id, apk, target.release.sizeBytes); dao.put(InstallStateEntity(target.id, "DOWNLOADED", localPath = apk.absolutePath)); api.report(credentials, target.id, "DOWNLOADED", "$id:downloaded", JSONObject().put("bytesDownloaded", apk.length()))
            }
            validateApk(applicationContext, apk, target.release); dao.put(InstallStateEntity(target.id, "VERIFIED", localPath = apk.absolutePath)); api.report(credentials, target.id, "VERIFIED", "$id:verified", JSONObject().put("checksumVerified", true))
            val sessionId = ApkInstaller(applicationContext, db).install(target.id, apk, target.release); api.report(credentials, target.id, "INSTALLING", "$id:installing", JSONObject().put("installerSessionId", sessionId.toString()))
        } catch (error: Throwable) {
            if (isCredentialTerminal(error)) {
                store.clear()
                return
            }
            val code = error.message?.take(120) ?: "INSTALL_FAILED"; dao.put(InstallStateEntity(target.id, "FAILED", localPath = apk.absolutePath, error = code)); runCatching { api.report(credentials, target.id, "FAILED", "$id:failed", JSONObject().put("errorCode", code).put("errorMessage", error.message ?: "Installation failed").put("installerStatus", code)) }.onFailure { reportError -> if (isCredentialTerminal(reportError)) store.clear() }
        }
    }
}

internal fun isCredentialTerminal(error: Throwable): Boolean {
    return error.message?.uppercase()?.contains("API_401") == true
}

internal fun withinMaintenanceWindow(start: String?, end: String?): Boolean {
    if (start == null && end == null) return true
    if (start == null || end == null) return false
    val now = java.time.Instant.now()
    val from = runCatching { java.time.Instant.parse(start) }.getOrNull() ?: return false
    val until = runCatching { java.time.Instant.parse(end) }.getOrNull() ?: return false
    return !until.isBefore(from) && !now.isBefore(from) && !now.isAfter(until)
}

internal fun restartInstallSessionRequiresReconciliation(sessionExists: Boolean, sessionActive: Boolean): Boolean = !sessionExists || !sessionActive

internal fun reopensLocalFailureForRetry(localState: String, targetState: String): Boolean = localState == "FAILED" && targetState in setOf("ASSIGNED", "RETRY_WAIT")
internal fun deploymentWorkDeferred(campaignState: String): Boolean = campaignState == "PAUSED"

object WorkScheduler {
    fun enqueue(context: Context) { val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(); val request = PeriodicWorkRequestBuilder<SyncWorker>(15, java.util.concurrent.TimeUnit.MINUTES).setConstraints(constraints).build(); WorkManager.getInstance(context).enqueueUniquePeriodicWork("deviceos-sync", ExistingPeriodicWorkPolicy.KEEP, request); WorkManager.getInstance(context).enqueueUniqueWork("deviceos-sync-now", ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build()) }
}

fun capabilities(context: Context): JSONObject { val cm = context.getSystemService(ConnectivityManager::class.java); val network = cm.activeNetwork; val caps = network?.let(cm::getNetworkCapabilities); val stat = StatFs(context.filesDir.absolutePath); val memory = ActivityManager.MemoryInfo().also { context.getSystemService(ActivityManager::class.java).getMemoryInfo(it) }; val loadAverage = runCatching { java.io.File("/proc/loadavg").bufferedReader().use { it.readLine().substringBefore(' ').toDouble() } }.getOrNull(); return JSONObject().put("deviceOwner", context.getSystemService(android.app.admin.DevicePolicyManager::class.java).isDeviceOwnerApp(context.packageName)).put("androidSdkInt", android.os.Build.VERSION.SDK_INT).put("networkConnected", caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true).put("networkType", when { caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WIFI"; caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "CELLULAR"; else -> "OTHER" }).put("storageFreeBytes", stat.availableBytes).put("storageTotalBytes", stat.totalBytes).put("memoryAvailableBytes", memory.availMem).put("memoryTotalBytes", memory.totalMem).put("lowMemory", memory.lowMemory).put("cpuLoad1m", loadAverage).put("cpuProcessorCount", Runtime.getRuntime().availableProcessors()).put("observationMode", !context.getSystemService(android.app.admin.DevicePolicyManager::class.java).isDeviceOwnerApp(context.packageName)) }

fun inventoryJson(context: Context): JSONArray { val values = JSONArray(); val flags = if (android.os.Build.VERSION.SDK_INT >= 28) android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES else @Suppress("DEPRECATION") android.content.pm.PackageManager.GET_SIGNATURES; val packages = if (android.os.Build.VERSION.SDK_INT >= 33) context.packageManager.getInstalledPackages(android.content.pm.PackageManager.PackageInfoFlags.of(flags.toLong())) else @Suppress("DEPRECATION") context.packageManager.getInstalledPackages(flags); packages.filter { it.packageName != context.packageName }.forEach { info -> values.put(JSONObject().put("packageName", info.packageName).put("versionCode", if (android.os.Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()).put("versionName", info.versionName).put("certificateSha256", packageCertificateSha256(info)).put("installSource", "PACKAGE_MANAGER")) }; return values }

private fun packageCertificateSha256(info: PackageInfo): String? { val signer = if (android.os.Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners?.firstOrNull() else @Suppress("DEPRECATION") info.signatures?.firstOrNull(); return signer?.let { java.security.MessageDigest.getInstance("SHA-256").digest(it.toByteArray()).joinToString("") { byte -> "%02x".format(byte) } } }
