package com.ooro.screenplayer

import com.ooro.screenplayer.player.downloadVerifiedAsset
import com.ooro.screenplayer.player.sha256
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.net.InetAddress
import java.net.ServerSocket

class AssetDownloadTest {
    @Test fun downloadHandlesSuccess404NetworkFailureAndChecksumMismatchWithoutDestroyingLkg() {
        val directory = kotlin.io.path.createTempDirectory("ooro-download-").toFile()
        val target = File(directory, "asset")
        val temp = File(directory, "asset.part")
        val content = "valid creative".toByteArray()
        val checksumFile = File(directory, "checksum").apply { writeBytes(content) }
        val checksum = sha256(checksumFile)
        val server = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
        val serverThread = Thread {
            while (!server.isClosed) runCatching {
                server.accept().use { socket ->
                    val reader = socket.getInputStream().bufferedReader()
                    val requestLine = reader.readLine().orEmpty()
                    while (!reader.readLine().isNullOrEmpty()) { }
                    val found = requestLine.contains(" /ok ")
                    val truncated = requestLine.contains(" /truncated ")
                    val body = if (found || truncated) content else ByteArray(0)
                    socket.getOutputStream().use { output ->
                        output.write("HTTP/1.1 ${if (found || truncated) "200 OK" else "404 Not Found"}\r\nContent-Length: ${if (truncated) content.size + 20 else body.size}\r\nConnection: close\r\n\r\n".toByteArray())
                        output.write(body)
                    }
                }
            }
        }.apply { isDaemon = true; start() }
        val base = "http://127.0.0.1:${server.localPort}"
        try {
            assertEquals(target, downloadVerifiedAsset("$base/ok", temp, target, checksum))
            assertArrayEquals(content, target.readBytes())
            assertFails { downloadVerifiedAsset("$base/missing", temp, target, checksum) }
            assertArrayEquals(content, target.readBytes())
            assertFails { downloadVerifiedAsset("$base/ok", temp, target, "00".repeat(32)) }
            assertArrayEquals(content, target.readBytes())
            assertFails { downloadVerifiedAsset("$base/truncated", temp, target, null) }
            assertArrayEquals(content, target.readBytes())
            assertFalse(temp.exists())
            // Port zero is never a valid TCP destination, so this cannot depend on runner port reuse.
            assertFails { downloadVerifiedAsset("http://127.0.0.1:0/ok", temp, target, checksum) }
            assertArrayEquals(content, target.readBytes())
        } finally { runCatching { server.close() }; serverThread.join(1_000); directory.deleteRecursively() }
    }

    private fun assertFails(block: () -> Unit) {
        try { block(); fail("Expected download to fail") } catch (_: Exception) { }
    }
}
