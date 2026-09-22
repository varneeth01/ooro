package com.ooro.screenplayer

import com.ooro.screenplayer.api.ManifestCodec
import com.ooro.screenplayer.model.CreativeType
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

class RealManifestContractTest {
    @Test
    fun parsesDatabaseGeneratedManifestWhenProvided() {
        val manifestPath = System.getenv("OORO_REAL_MANIFEST_PATH")
        val campaignId = System.getenv("OORO_REAL_CAMPAIGN_ID")
        val creativeType = System.getenv("OORO_REAL_CREATIVE_TYPE") ?: "IMAGE"
        assumeTrue(!manifestPath.isNullOrBlank() && !campaignId.isNullOrBlank())

        val manifest = ManifestCodec.parse(File(manifestPath!!).readText())
        val item = manifest.items.single { it.campaignId == campaignId }

        assertEquals(CreativeType.valueOf(creativeType), item.type)
        assertTrue(item.url.isNotBlank())
        assertEquals(64, item.checksum?.length)
        assertNotNull(item.assetId)
        assertEquals("OORO Test Advertiser", item.offer.brandName)
        assertEquals("WEB PUSH TEST — 20% OFF", item.offer.offerTitle)
        assertTrue(item.offer.validQrUrl?.startsWith("http") == true)
    }
}
