package com.ooro.deviceagent.install

import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.content.pm.PackageInstaller
import android.os.Build
import com.ooro.deviceagent.data.AgentDatabase
import com.ooro.deviceagent.data.AgentDatabaseProvider
import com.ooro.deviceagent.data.InstallStateEntity
import com.ooro.deviceagent.model.Release
import com.ooro.deviceagent.network.sha256
import kotlinx.coroutines.runBlocking
import java.io.File
import java.security.MessageDigest

data class ApkValidation(val packageName: String, val versionCode: Long, val certificateSha256: String)

fun installerCallbackState(status: Int): String = when (status) {
    PackageInstaller.STATUS_SUCCESS -> "INSTALLED"
    PackageInstaller.STATUS_PENDING_USER_ACTION -> "PENDING_USER_ACTION"
    else -> "FAILED"
}

fun installedPackageMatches(context: Context, release: Release): Boolean {
    val info = runCatching { context.packageManager.getPackageInfo(release.packageName, if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES) }.getOrNull() ?: return false
    val versionCode = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
    if (versionCode < release.versionCode) return false
    val certificate = installedPackageCertificateSha256(context, release.packageName) ?: return false
    return certificate.equals(release.certificateSha256, true)
}

fun installedPackageCertificateSha256(context: Context, packageName: String): String? {
    val info = runCatching { context.packageManager.getPackageInfo(packageName, if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES) }.getOrNull() ?: return null
    val signer = if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners?.firstOrNull() else @Suppress("DEPRECATION") info.signatures?.firstOrNull()
    return signer?.let { MessageDigest.getInstance("SHA-256").digest(it.toByteArray()).joinToString("") { byte -> "%02x".format(byte) } }
}

fun validateApk(context: Context, file: File, release: Release): ApkValidation {
    if (!file.exists() || file.length() != release.sizeBytes) error("APK_SIZE_MISMATCH")
    if (!sha256(file).equals(release.sha256, true)) error("APK_SHA256_MISMATCH")
    if (Build.VERSION.SDK_INT < release.minSdk) error("APK_MIN_SDK_UNSUPPORTED")
    val info = context.packageManager.getPackageArchiveInfo(file.absolutePath, if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES) ?: error("APK_PACKAGE_INVALID")
    val packageName = info.packageName ?: error("APK_PACKAGE_MISSING")
    if (packageName != release.packageName) error("APK_PACKAGE_MISMATCH")
    val versionCode = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
    if (versionCode != release.versionCode) error("APK_VERSION_MISMATCH")
    val installed = runCatching { context.packageManager.getPackageInfo(release.packageName, 0) }.getOrNull()
    val installedVersion = installed?.let { if (Build.VERSION.SDK_INT >= 28) it.longVersionCode else @Suppress("DEPRECATION") it.versionCode.toLong() }
    if (installedVersion != null && release.versionCode < installedVersion) error("APK_DOWNGRADE_BLOCKED")
    if (Build.VERSION.SDK_INT >= 28) {
        val signer = info.signingInfo?.apkContentsSigners?.firstOrNull() ?: error("APK_SIGNATURE_MISSING")
        val cert = MessageDigest.getInstance("SHA-256").digest(signer.toByteArray()).joinToString("") { "%02x".format(it) }
        if (!cert.equals(release.certificateSha256, true)) error("APK_CERTIFICATE_MISMATCH")
        return ApkValidation(packageName, versionCode, cert)
    }
    @Suppress("DEPRECATION")
    val signer = info.signatures?.firstOrNull() ?: error("APK_SIGNATURE_MISSING")
    @Suppress("DEPRECATION")
    val cert = MessageDigest.getInstance("SHA-256").digest(signer.toByteArray()).joinToString("") { "%02x".format(it) }
    if (!cert.equals(release.certificateSha256, true)) error("APK_CERTIFICATE_MISMATCH")
    return ApkValidation(packageName, versionCode, cert)
}

class ApkInstaller(private val context: Context, private val db: AgentDatabase) {
    fun install(targetId: String, file: File, release: Release): Int {
        val packageInstaller = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply { setAppPackageName(release.packageName); setSize(file.length()) }
        val sessionId = packageInstaller.createSession(params)
        db.installStates().let { dao -> runBlocking { dao.put(InstallStateEntity(targetId, "INSTALLING", sessionId, file.absolutePath)) } }
        val session = packageInstaller.openSession(sessionId)
        session.use { current -> file.inputStream().use { input -> current.openWrite("base.apk", 0, file.length()).use { output -> input.copyTo(output); output.flush(); current.fsync(output) } }; val intent = Intent(context, InstallResultReceiver::class.java).setAction(InstallResultReceiver.ACTION).putExtra("targetId", targetId).putExtra("sessionId", sessionId); val pending = PendingIntent.getBroadcast(context, sessionId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE); current.commit(pending.intentSender) }
        return sessionId
    }
}

class InstallResultReceiver : BroadcastReceiver() {
    companion object { const val ACTION = "com.ooro.deviceagent.INSTALL_RESULT" }
    override fun onReceive(context: Context, intent: Intent) {
        val sessionId = intent.getIntExtra("sessionId", -1); val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE); val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        val dao = AgentDatabaseProvider.get(context).installStates()
        runBlocking {
            dao.bySession(sessionId)?.let { current ->
                if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    dao.put(current.copy(state = "PENDING_USER_ACTION", updatedAt = System.currentTimeMillis(), error = message ?: "PENDING_USER_ACTION_REQUIRED"))
                    intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)?.let(context::startActivity)
                } else {
                    val state = installerCallbackState(status)
                    dao.put(current.copy(state = state, updatedAt = System.currentTimeMillis(), error = message ?: if (state == "FAILED") "INSTALL_FAILED" else null))
                }
            }
        }
        com.ooro.deviceagent.sync.WorkScheduler.enqueue(context)
    }
}
