package com.ooro.screenplayer.layoutstudio

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.zIndex

/** Native Compose geometry host. Content is injected by the caller; this component never grants ad eligibility. */
@Composable
fun LayoutStudioRenderer(
    contract: LayoutStudioContract,
    modifier: Modifier = Modifier,
    enabledCapabilities: Set<String> = emptySet(),
    content: @Composable (LayoutStudioZone) -> Unit,
) {
    BoxWithConstraints(modifier.clipToBounds()) {
        val density = LocalDensity.current
        val screenWidthPx = with(density) { maxWidth.roundToPx() }.coerceAtLeast(1)
        val screenHeightPx = with(density) { maxHeight.roundToPx() }.coerceAtLeast(1)
        contract.zones.asSequence().filter { it.visible }.forEach { zone ->
            // Capability check is repeated at render time; invalid content cannot fall through to execution.
            val known = zone.type in setOf("IMAGE", "VIDEO", "TEXT", "LOGO", "QR_OFFER", "SPONSORED_AD", "BACKGROUND_IMAGE") || zone.type in enabledCapabilities
            if (known) {
                val rect = LayoutStudioInterpreter.toPixelRect(zone, screenWidthPx, screenHeightPx)
                val zoneSize = with(density) { androidx.compose.ui.unit.DpSize(rect.width.toDp(), rect.height.toDp()) }
                Box(
                    Modifier.offset { IntOffset(rect.left, rect.top) }
                        .size(zoneSize)
                        .zIndex(zone.zIndex.toFloat())
                        .clipToBounds(),
                ) { content(zone) }
            }
        }
    }
}
