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
        val target = File(root, item.id); if (target.exists() && (item.checksum == null || sha256(target) == item.checksum)) return@withContext target
        val temp = File(root, "${item.id}.tmp"); runCatching { (URL(item.url).openConnection() as HttpURLConnection).apply { connectTimeout = 10_000; readTimeout = 30_000 }.inputStream.use { input -> temp.outputStream().use { input.copyTo(it) } }; if (item.checksum != null && sha256(temp) != item.checksum) error("checksum mismatch"); if (!temp.renameTo(target)) error("atomic asset move failed"); target }.getOrNull()
    }
    fun cleanup(keepIds: Set<String>) { root.listFiles()?.filter { it.isFile && it.name !in keepIds && !it.name.endsWith(".tmp") }?.forEach { it.delete() } }
    private fun sha256(file: File): String = MessageDigest.getInstance("SHA-256").digest(file.readBytes()).joinToString("") { "%02x".format(it) }
}
