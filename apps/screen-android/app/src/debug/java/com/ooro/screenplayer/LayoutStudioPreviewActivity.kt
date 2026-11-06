package com.ooro.screenplayer

import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.onSizeChanged
import android.util.Log
import com.ooro.screenplayer.layoutstudio.LayoutParseResult
import com.ooro.screenplayer.layoutstudio.LayoutStudioInterpreter
import com.ooro.screenplayer.layoutstudio.LayoutStudioRenderer
import com.ooro.screenplayer.layoutstudio.LayoutStudioZone

/** Local synthetic layout preview. No API client, ViewModel, campaign, media proof, or real content. */
class LayoutStudioPreviewActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        val json = intent.getStringExtra("layoutContract") ?: fixtureContract
        val parsed = LayoutStudioInterpreter.parse(json)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(background = Color(0xFF080A0D), surface = Color(0xFF111513), primary = Color(0xFFDFFF00))) {
                when (parsed) {
                    is LayoutParseResult.Valid -> LayoutStudioRenderer(parsed.contract, Modifier.fillMaxSize()) { zone -> FixtureZone(zone) }
                    is LayoutParseResult.Invalid -> Box(Modifier.fillMaxSize().background(Color(0xFF120D0D)), contentAlignment = Alignment.Center) { Text("Layout unavailable · ${parsed.code}", color = Color.White) }
                }
            }
        }
    }

    private companion object {
        val fixtureContract = """{"contractVersion":1,"mode":"CUSTOM","preset":"CUSTOM_CANVAS","profileId":"OORO_PREMIUM","target":{"width":1280,"height":720},"zones":[{"id":"hero","type":"IMAGE","label":"SYNTHETIC IMAGE · FIT","schemaVersion":1,"geometry":{"x":0,"y":0,"width":0.8,"height":0.85},"zIndex":0,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true},{"id":"sponsor","type":"SPONSORED_AD","label":"SPONSOR · NEUTRAL TEST","schemaVersion":1,"geometry":{"x":0,"y":0.85,"width":0.8,"height":0.15},"zIndex":1,"fit":"FIT","contentBinding":{"kind":"APPROVED_SPONSOR","referenceId":"synthetic-only"},"visible":true},{"id":"qr","type":"QR_OFFER","label":"QR · PLACEHOLDER","schemaVersion":1,"geometry":{"x":0.8,"y":0,"width":0.2,"height":0.5},"zIndex":2,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true},{"id":"nav","type":"TEXT","label":"NAVIGATION · STATIC","schemaVersion":1,"geometry":{"x":0.8,"y":0.5,"width":0.2,"height":0.5},"zIndex":3,"fit":"FIT","contentBinding":{"kind":"NONE"},"visible":true}]}"""
    }
}

@Composable private fun FixtureZone(zone: LayoutStudioZone) {
    val fill = when (zone.type) {
        "IMAGE" -> Color(0xFF242A24)
        "SPONSORED_AD" -> Color(0xFF303629)
        "QR_OFFER" -> Color(0xFF1A211D)
        else -> Color(0xFF151A18)
    }
    Box(Modifier.fillMaxSize().background(fill).border(1.dp, Color(0x88DFFF00)).semantics { contentDescription = "LayoutStudioZone:${zone.id}" }.onSizeChanged { Log.i("OoroLayoutStudioPreview", "zone=${zone.id} type=${zone.type} boundsPx=${it.width}x${it.height} synthetic=true") }, contentAlignment = Alignment.Center) {
        Text(zone.label, Modifier.padding(8.dp), color = Color.White, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
        Text("TL · TR\nBL · BR", Modifier.align(Alignment.TopStart).padding(5.dp), color = Color(0xFFDFFF00), fontSize = 8.sp, lineHeight = 10.sp)
        Text("EDGE MARKERS", Modifier.align(Alignment.BottomEnd).padding(5.dp), color = Color(0xFFDFFF00), fontSize = 8.sp)
    }
}
