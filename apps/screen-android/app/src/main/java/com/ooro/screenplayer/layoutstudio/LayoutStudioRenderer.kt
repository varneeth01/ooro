package com.ooro.screenplayer.layoutstudio

import com.ooro.screenplayer.BuildConfig
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import android.util.Log
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.zIndex

/** Native Compose geometry host. Content is injected by the caller; this component never grants ad eligibility. */
@Composable
fun LayoutStudioRenderer(
    contract: LayoutStudioContract,
    modifier: Modifier = Modifier,
    content: @Composable (LayoutStudioZone) -> Unit,
) {
    BoxWithConstraints(modifier.clipToBounds()) {
        val density = LocalDensity.current
        val screenWidthPx = with(density) { maxWidth.roundToPx() }.coerceAtLeast(1)
        val screenHeightPx = with(density) { maxHeight.roundToPx() }.coerceAtLeast(1)
        contract.zones.asSequence().filter { it.visible }.forEach { zone ->
            // The parser and typed resolver enforce capabilities/content authority. The
            // geometry host still gives unresolved widgets a bounded slot for fallback UI.
            val rect = LayoutStudioInterpreter.toPixelRect(zone, screenWidthPx, screenHeightPx)
            val zoneSize = with(density) { androidx.compose.ui.unit.DpSize(rect.width.toDp(), rect.height.toDp()) }
            Box(
                Modifier.offset { IntOffset(rect.left, rect.top) }
                    .size(zoneSize)
                    .zIndex(zone.zIndex.toFloat())
                    .clipToBounds()
                    .semantics { contentDescription = "LayoutStudioZone:${zone.id}" }
                    .onSizeChanged { size ->
                        if (BuildConfig.DEBUG) Log.d("OoroLayoutStudio", "zone=${zone.id} type=${zone.type} boundsPx=${size.width}x${size.height}")
                    },
            ) { content(zone) }
        }
    }
}
