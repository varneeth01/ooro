package com.ooro.screenplayer.player

import android.content.Context
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.safeCacheName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.io.FileOutputStream
import android.util.Log

class AssetManager(private val context: Context) {
    private val root get() = File(context.filesDir, "creative-cache").also { it.mkdirs() }
    suspend fun ensure(item: ManifestItem): File? = withContext(Dispatchers.IO) {
        if (item.url.isBlank()) return@withContext null
        val safeId = item.id.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120)
        val target = File(root, safeId)
        val digestRecord = File(root, digestRecordName(safeId))
        if (isVerifiedOrRecordLegacyCache(target, item.checksum, digestRecord)) {
            Log.i("OoroScreen", "asset ready assetId=${item.id} source=cache checksumMatch=true")
            return@withContext target
        }
        val temp = File(root, "$safeId.part")
        runCatching {
            val downloaded = downloadVerifiedAsset(item.url, temp, target, item.checksum)
            val digest = sha256(downloaded)
            writeDigestRecord(digestRecord, digest)
            downloaded
        }.onFailure { error -> Log.e("OoroScreen", "asset download failed assetId=${item.id} tempExists=${temp.exists()} tempBytes=${temp.length()} targetExists=${target.exists()} error=${error.message}", error) }.getOrNull()
    }
    fun cleanup(keepIds: Set<String>) {
        val safe = keepIds.map { it.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120) }
        val keep = safe.flatMap { listOf(it, digestRecordName(it)) }.toSet()
        root.listFiles()?.filter { it.isFile && it.name !in keep && !it.name.endsWith(".part") }
            ?.sortedBy { it.lastModified() }?.forEach { it.delete() }
    }
    fun clear() { root.listFiles()?.forEach { it.deleteRecursively() } }
    suspend fun verifiedItemIds(items: List<ManifestItem>): Set<String> = withContext(Dispatchers.IO) {
        items.asSequence().filter { it.url.isNotBlank() }
            .filter { item ->
                val file = File(root, item.safeCacheName())
                isVerifiedOrRecordLegacyCache(file, item.checksum, File(root, digestRecordName(item.safeCacheName())))
            }
            .map { it.id }.toSet()
    }
    suspend fun verify(items: List<ManifestItem>): Pair<Int, Int> = withContext(Dispatchers.IO) {
        val required = items.count { it.url.isNotBlank() }
        val valid = verifiedItemIds(items).size
        valid to (required - valid)
    }
    fun storageBytes(): Long = root.walkTopDown().filter { it.isFile }.sumOf { it.length() }
}

private fun digestRecordName(safeId: String) = ".$safeId.sha256"

private fun readDigestRecord(file: File): String? =
    runCatching { file.takeIf(File::isFile)?.readText()?.trim() }.getOrNull()

private fun isVerifiedOrRecordLegacyCache(file: File, expectedChecksum: String?, digestRecord: File): Boolean {
    val record = readDigestRecord(digestRecord)
    if (isVerifiedCachedAsset(file, expectedChecksum, record)) return true
    // Older releases had no local digest record when the API omitted a checksum.
    // Fingerprint a non-empty legacy file once so later reads detect disk corruption.
    if (expectedChecksum == null && record == null && file.isFile && file.length() > 0) {
        val digest = sha256(file)
        runCatching { writeDigestRecord(digestRecord, digest) }.getOrElse { return false }
        return isVerifiedCachedAsset(file, null, digest)
    }
    return false
}

internal fun writeDigestRecord(target: File, digest: String) {
    val temp = File(target.parentFile, "${target.name}.part")
    try {
        FileOutputStream(temp).use { stream ->
            stream.write(digest.toByteArray(Charsets.US_ASCII))
            stream.fd.sync()
        }
        try {
            Files.move(temp.toPath(), target.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } catch (_: AtomicMoveNotSupportedException) {
            Files.move(temp.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }
    } finally { temp.delete() }
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

internal fun isVerifiedCachedAsset(file: File, expectedChecksum: String?, recordedChecksum: String? = null): Boolean {
    if (!file.isFile || file.length() <= 0) return false
    val actual = sha256(file)
    val expected = expectedChecksum ?: recordedChecksum ?: return false
    return actual.equals(expected, ignoreCase = true)
}

@Synchronized
internal fun downloadVerifiedAsset(url: String, temp: File, target: File, expectedChecksum: String?): File {
    temp.delete()
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 10_000
    connection.readTimeout = 30_000
    connection.instanceFollowRedirects = true
    try {
        val responseCode = connection.responseCode
        if (responseCode !in 200..299) error("HTTP $responseCode")
        val expectedLength = connection.contentLengthLong
        connection.inputStream.use { input ->
            temp.outputStream().use { output ->
                input.copyTo(output)
                output.fd.sync()
            }
        }
        if (expectedLength >= 0 && temp.length() != expectedLength) error("incomplete asset download")
        if (expectedChecksum != null && !sha256(temp).equals(expectedChecksum, true)) error("checksum mismatch")
        try {
            Files.move(temp.toPath(), target.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } catch (_: AtomicMoveNotSupportedException) {
            Files.move(temp.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }
        return target
    } finally { connection.disconnect(); if (temp.exists()) temp.delete() }
}
