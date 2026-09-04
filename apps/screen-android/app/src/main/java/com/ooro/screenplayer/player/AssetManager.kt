package com.ooro.screenplayer.player

import android.content.Context
import com.ooro.screenplayer.model.ManifestItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class AssetManager(private val context: Context) {
    private val root get() = File(context.filesDir, "creative-cache").also { it.mkdirs() }
    suspend fun ensure(item: ManifestItem): File? = withContext(Dispatchers.IO) {
        if (item.url.isBlank()) return@withContext null
        val safeId = item.id.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120)
        val target = File(root, safeId); if (target.exists() && target.length() > 0 && (item.checksum == null || sha256(target) == item.checksum)) return@withContext target
        val temp = File(root, "$safeId.part"); runCatching { temp.delete(); val connection = URL(item.url).openConnection() as HttpURLConnection; connection.connectTimeout = 10_000; connection.readTimeout = 30_000; connection.instanceFollowRedirects = true; if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}"); connection.inputStream.use { input -> temp.outputStream().use { input.copyTo(it) } }; if (item.checksum != null && !sha256(temp).equals(item.checksum, true)) error("checksum mismatch"); if (target.exists()) target.delete(); if (!temp.renameTo(target)) error("atomic asset move failed"); target }.getOrNull()
    }
    fun cleanup(keepIds: Set<String>) { val safe = keepIds.map { it.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120) }.toSet(); root.listFiles()?.filter { it.isFile && it.name !in safe && !it.name.endsWith(".part") }?.sortedBy { it.lastModified() }?.forEach { it.delete() } }
    private fun sha256(file: File): String = MessageDigest.getInstance("SHA-256").digest(file.readBytes()).joinToString("") { "%02x".format(it) }
}
