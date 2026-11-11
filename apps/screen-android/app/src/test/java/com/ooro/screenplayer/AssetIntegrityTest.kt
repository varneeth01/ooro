package com.ooro.screenplayer

import com.ooro.screenplayer.player.sha256
import com.ooro.screenplayer.player.isVerifiedCachedAsset
import com.ooro.screenplayer.player.writeDigestRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class AssetIntegrityTest {
    @Test fun checksumDetectsCorruptOrMismatchedAssets() {
        val file = File.createTempFile("ooro-asset", ".bin")
        try {
            file.writeBytes("verified creative".toByteArray())
            val expected = sha256(file)
            assertEquals(expected, sha256(file))
            file.appendText("corrupt")
            assertNotEquals(expected, sha256(file))
        } finally { file.delete() }
    }

    @Test fun cachedChecksumComparisonIsCaseInsensitiveAndRejectsCorruption() {
        val file = File.createTempFile("ooro-cache-verified", ".bin")
        try {
            file.writeBytes("verified creative".toByteArray())
            val checksum = sha256(file)
            assertTrue(isVerifiedCachedAsset(file, checksum.uppercase()))
            assertFalse(isVerifiedCachedAsset(file, "00".repeat(32)))
            file.appendText("corruption")
            assertFalse(isVerifiedCachedAsset(file, checksum))
        } finally { file.delete() }
    }

    @Test fun checksumlessAssetRequiresPersistedLocalDigestAndDetectsLaterCorruption() {
        val directory = kotlin.io.path.createTempDirectory("ooro-digest-record-").toFile()
        val asset = File(directory, "asset.bin")
        val record = File(directory, ".asset.bin.sha256")
        try {
            asset.writeBytes("downloaded over TLS".toByteArray())
            val digest = sha256(asset)
            assertFalse(isVerifiedCachedAsset(asset, expectedChecksum = null))
            writeDigestRecord(record, digest)
            assertTrue(isVerifiedCachedAsset(asset, expectedChecksum = null, recordedChecksum = record.readText()))
            asset.appendText("corrupt")
            assertFalse(isVerifiedCachedAsset(asset, expectedChecksum = null, recordedChecksum = record.readText()))
        } finally { directory.deleteRecursively() }
    }
}
