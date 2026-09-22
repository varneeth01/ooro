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
                    val body = if (found) content else ByteArray(0)
                    socket.getOutputStream().use { output ->
                        output.write("HTTP/1.1 ${if (found) "200 OK" else "404 Not Found"}\r\nContent-Length: ${body.size}\r\nConnection: close\r\n\r\n".toByteArray())
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
            server.close()
            assertFails { downloadVerifiedAsset("$base/ok", temp, target, checksum) }
            assertArrayEquals(content, target.readBytes())
        } finally { runCatching { server.close() }; serverThread.join(1_000); directory.deleteRecursively() }
    }

    private fun assertFails(block: () -> Unit) {
        try { block(); fail("Expected download to fail") } catch (_: Exception) { }
    }
}
