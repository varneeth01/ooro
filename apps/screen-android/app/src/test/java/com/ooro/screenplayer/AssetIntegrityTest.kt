package com.ooro.screenplayer

import com.ooro.screenplayer.player.sha256
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
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
}
