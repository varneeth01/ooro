package com.ooro.screenplayer.player

import android.content.Context
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.safeCacheName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import android.util.Log

class AssetManager(private val context: Context) {
    private val root get() = File(context.filesDir, "creative-cache").also { it.mkdirs() }
    suspend fun ensure(item: ManifestItem): File? = withContext(Dispatchers.IO) {
        if (item.url.isBlank()) return@withContext null
        val safeId = item.id.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120)
        val target = File(root, safeId); if (target.exists() && target.length() > 0 && (item.checksum == null || sha256(target) == item.checksum)) { Log.i("OoroScreen", "asset ready assetId=${item.id} source=cache checksumMatch=true"); return@withContext target }
        val temp = File(root, "$safeId.part"); runCatching { downloadVerifiedAsset(item.url, temp, target, item.checksum) }.onFailure { error -> Log.w("OoroScreen", "asset download failed assetId=${item.id} error=${error.message}") }.getOrNull()
    }
    fun cleanup(keepIds: Set<String>) { val safe = keepIds.map { it.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120) }.toSet(); root.listFiles()?.filter { it.isFile && it.name !in safe && !it.name.endsWith(".part") }?.sortedBy { it.lastModified() }?.forEach { it.delete() } }
    fun clear() { root.listFiles()?.forEach { it.deleteRecursively() } }
    suspend fun verify(items: List<ManifestItem>): Pair<Int, Int> = withContext(Dispatchers.IO) {
        var valid = 0
        var missing = 0
        items.filter { it.url.isNotBlank() }.forEach { item ->
            val file = File(root, item.safeCacheName())
            if (file.exists() && file.length() > 0 && (item.checksum == null || sha256(file).equals(item.checksum, true))) valid++ else missing++
        }
        valid to missing
    }
    fun storageBytes(): Long = root.walkTopDown().filter { it.isFile }.sumOf { it.length() }
}

internal fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
        val buffer = ByteArray(8192)
        var read = input.read(buffer)
        while (read >= 0) {
            if (read > 0) digest.update(buffer, 0, read)
            read = input.read(buffer)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

internal fun downloadVerifiedAsset(url: String, temp: File, target: File, expectedChecksum: String?): File {
    temp.delete()
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 10_000
    connection.readTimeout = 30_000
    connection.instanceFollowRedirects = true
    try {
        val responseCode = connection.responseCode
        if (responseCode !in 200..299) error("HTTP $responseCode")
        connection.inputStream.use { input -> temp.outputStream().use { output -> input.copyTo(output) } }
        if (expectedChecksum != null && !sha256(temp).equals(expectedChecksum, true)) error("checksum mismatch")
        if (target.exists() && !target.delete()) error("existing asset could not be replaced")
        if (!temp.renameTo(target)) error("atomic asset move failed")
        return target
    } finally { connection.disconnect() }
}
