package com.ooro.screenplayer

import com.ooro.screenplayer.layoutstudio.LayoutParseResult
import com.ooro.screenplayer.layoutstudio.LayoutStudioInterpreter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LayoutStudioInterpreterTest {
    private fun contract(zones: String = """
        [{"id":"hero","type":"IMAGE","label":"Hero","schemaVersion":1,"geometry":{"x":0,"y":0,"width":0.8,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"APPROVED_CREATIVE","referenceId":"asset-1"},"visible":true},
         {"id":"copy","type":"TEXT","label":"Offer","schemaVersion":1,"geometry":{"x":0.8,"y":0,"width":0.2,"height":1},"zIndex":1,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true}]
    """.trimIndent()) = """{"contractVersion":1,"mode":"CUSTOM","preset":"CUSTOM_CANVAS","profileId":"OORO_PREMIUM","target":{"width":1280,"height":720},"zones":$zones}"""

    @Test fun `parses core widgets and converts normalized geometry at target profiles`() {
        val parsed = LayoutStudioInterpreter.parse(contract()) as LayoutParseResult.Valid
        val hero = parsed.contract.zones.first()
        assertEquals(1024, LayoutStudioInterpreter.toPixelRect(hero, 1280, 720).width)
        assertEquals(683, LayoutStudioInterpreter.toPixelRect(hero, 854, 480).width)
        assertEquals(1536, LayoutStudioInterpreter.toPixelRect(hero, 1920, 1080).width)
    }

    @Test fun `main campaign ad is a supported slot but does not grant eligibility`() {
        val mainAd = """[{"id":"main","type":"MAIN_AD","label":"Main ad","schemaVersion":1,"geometry":{"x":0,"y":0,"width":1,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"APPROVED_CREATIVE","referenceId":"creative-ref"},"visible":true}]"""
        val parsed = LayoutStudioInterpreter.parse(contract(mainAd))
        assertTrue(parsed is LayoutParseResult.Valid)
        // The interpreter only carries the binding reference; campaign eligibility remains outside layout parsing.
        assertEquals("APPROVED_CREATIVE", (parsed as LayoutParseResult.Valid).contract.zones.single().bindingKind)
    }

    @Test fun `schema widgets without a native implementation fail closed`() {
        val staticQr = """[{"id":"qr","type":"STATIC_QR","label":"QR","schemaVersion":1,"geometry":{"x":0,"y":0,"width":1,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"AUTHORIZED_DESTINATION","referenceId":"destination-ref"},"visible":true}]"""
        assertEquals("UNSUPPORTED_WIDGET_TYPE", (LayoutStudioInterpreter.parse(contract(staticQr)) as LayoutParseResult.Invalid).code)
    }

    @Test fun `pixel edges round deterministically within half a pixel`() {
        val parsed = LayoutStudioInterpreter.parse(contract()) as LayoutParseResult.Valid
        val rect = LayoutStudioInterpreter.toPixelRect(parsed.contract.zones[1], 854, 480)
        assertEquals(683, rect.left)
        assertEquals(854, rect.right)
        assertEquals(0, rect.top)
        assertEquals(480, rect.bottom)
    }

    @Test fun `optional widgets require explicit capabilities`() {
        val zones = """[{"id":"ticker","type":"TICKER","label":"Ticker","schemaVersion":1,"geometry":{"x":0,"y":0,"width":1,"height":0.1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true}]"""
        val rejected = LayoutStudioInterpreter.parse(contract(zones)) as LayoutParseResult.Invalid
        assertEquals("WIDGET_CAPABILITY_REQUIRED", rejected.code)
        assertTrue(LayoutStudioInterpreter.parse(contract(zones), setOf("TICKER")) is LayoutParseResult.Valid)
    }

    @Test fun `capability widgets remain within per-layout resource budgets`() {
        val maps = """[{"id":"map-a","type":"NAVIGATION_MAP","label":"Map A","schemaVersion":1,"geometry":{"x":0,"y":0,"width":0.5,"height":1},"zIndex":0,"contentBinding":{"kind":"NONE"},"visible":true},{"id":"map-b","type":"NAVIGATION_MAP","label":"Map B","schemaVersion":1,"geometry":{"x":0.5,"y":0,"width":0.5,"height":1},"zIndex":1,"contentBinding":{"kind":"NONE"},"visible":true}]"""
        val result = LayoutStudioInterpreter.parse(contract(maps), setOf("NAVIGATION_MAP")) as LayoutParseResult.Invalid
        assertEquals("WIDGET_BUDGET_EXCEEDED", result.code)
    }

    @Test fun `invalid bounds overlap and multiple video zones fail closed`() {
        val outside = """[{"id":"bad","type":"IMAGE","label":"Bad","schemaVersion":1,"geometry":{"x":0.9,"y":0,"width":0.2,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true}]"""
        assertEquals("ZONE_OUT_OF_BOUNDS", (LayoutStudioInterpreter.parse(contract(outside)) as LayoutParseResult.Invalid).code)
        val video = """[{"id":"v1","type":"VIDEO","label":"V1","schemaVersion":1,"geometry":{"x":0,"y":0,"width":0.5,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true},{"id":"v2","type":"VIDEO","label":"V2","schemaVersion":1,"geometry":{"x":0.5,"y":0,"width":0.5,"height":1},"zIndex":1,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true}]"""
        assertEquals("VIDEO_DECODER_BUDGET_EXCEEDED", (LayoutStudioInterpreter.parse(contract(video)) as LayoutParseResult.Invalid).code)
    }

    @Test fun `unbound sponsor never passes validation`() {
        val sponsor = """[{"id":"s","type":"SPONSORED_AD","label":"Sponsor","schemaVersion":1,"geometry":{"x":0,"y":0,"width":1,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true}]"""
        assertEquals("SPONSOR_AUTHORIZATION_REQUIRED", (LayoutStudioInterpreter.parse(contract(sponsor)) as LayoutParseResult.Invalid).code)
    }

    @Test fun `main ad plus a video widget is rejected because runtime main media may itself be video`() {
        val zones = """[{"id":"main","type":"MAIN_AD","label":"Main","schemaVersion":1,"geometry":{"x":0,"y":0,"width":0.6,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true},{"id":"video","type":"VIDEO","label":"Video","schemaVersion":1,"geometry":{"x":0.6,"y":0,"width":0.4,"height":1},"zIndex":1,"fit":"FIT","contentBinding":{"kind":"APPROVED_CREATIVE","referenceId":"creative"},"visible":true}]"""
        val result = LayoutStudioInterpreter.parse(contract(zones)) as LayoutParseResult.Invalid
        assertEquals("VIDEO_DECODER_BUDGET_EXCEEDED", result.code)
    }

    @Test fun `destination and creative bindings are restricted to compatible widget types`() {
        val textCreative = """[{"id":"copy","type":"TEXT","label":"Copy","schemaVersion":1,"geometry":{"x":0,"y":0,"width":1,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"APPROVED_CREATIVE","referenceId":"creative"},"visible":true}]"""
        assertEquals("CREATIVE_SLOT_MISMATCH", (LayoutStudioInterpreter.parse(contract(textCreative)) as LayoutParseResult.Invalid).code)
        val imageDestination = """[{"id":"image","type":"IMAGE","label":"Image","schemaVersion":1,"geometry":{"x":0,"y":0,"width":1,"height":1},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"AUTHORIZED_DESTINATION","referenceId":"destination"},"visible":true}]"""
        assertEquals("DESTINATION_SLOT_MISMATCH", (LayoutStudioInterpreter.parse(contract(imageDestination)) as LayoutParseResult.Invalid).code)
    }

    @Test fun `malformed JSON returns safe error`() {
        val result = LayoutStudioInterpreter.parse("not-json")
        assertTrue(result is LayoutParseResult.Invalid)
        assertFalse((result as LayoutParseResult.Invalid).detail.contains("not-json"))
    }
}
