package com.ooro.screenplayer.layoutstudio

import org.json.JSONObject
import kotlin.math.roundToInt

/** Native read-only interpreter for Layout Studio contractVersion 1. Assignment stays server-disabled. */
data class LayoutStudioContract(
    val contractVersion: Int,
    val targetWidth: Int,
    val targetHeight: Int,
    val zones: List<LayoutStudioZone>,
)

data class LayoutStudioZone(
    val id: String,
    val type: String,
    val label: String,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val zIndex: Int,
    val fit: String,
    val bindingKind: String,
    val referenceId: String?,
    val visible: Boolean,
)

data class PixelRect(val left: Int, val top: Int, val right: Int, val bottom: Int) {
    val width: Int get() = right - left
    val height: Int get() = bottom - top
}

sealed interface LayoutParseResult {
    data class Valid(val contract: LayoutStudioContract) : LayoutParseResult
    data class Invalid(val code: String, val detail: String) : LayoutParseResult
}

object LayoutStudioInterpreter {
    private val baseWidgets = setOf("MAIN_AD", "IMAGE", "VIDEO", "TEXT", "LOGO", "QR_OFFER", "SPONSORED_AD", "BACKGROUND_IMAGE")
    private val capabilityWidgets = setOf("CLOCK", "WEATHER", "TICKER", "NAVIGATION_MAP")
    private val overlays = setOf("TEXT", "LOGO", "CLOCK")

    fun parse(json: String, enabledCapabilities: Set<String> = emptySet()): LayoutParseResult {
      return try {
        val root = JSONObject(json)
        if (root.optInt("contractVersion", -1) != 1 || root.optString("mode") != "CUSTOM") return invalid("UNSUPPORTED_CONTRACT", "Only Custom contract version 1 is supported.")
        val target = root.optJSONObject("target") ?: return invalid("INVALID_TARGET", "Target resolution is missing.")
        val targetWidth = target.optInt("width", 0)
        val targetHeight = target.optInt("height", 0)
        if (targetWidth !in 320..7680 || targetHeight !in 240..4320) return invalid("INVALID_TARGET", "Target dimensions are outside the supported range.")
        val array = root.optJSONArray("zones") ?: return invalid("INVALID_ZONES", "Zones are missing.")
        if (array.length() !in 1..24) return invalid("INVALID_ZONES", "A Custom layout requires 1–24 zones.")
        val zones = ArrayList<LayoutStudioZone>(array.length())
        val ids = HashSet<String>()
        var videoCount = 0
        var mainAdCount = 0
        var sponsorCount = 0
        val boundedWidgetCounts = HashMap<String, Int>()
        for (index in 0 until array.length()) {
            val zone = array.optJSONObject(index) ?: return invalid("INVALID_ZONE", "Zone $index is not an object.")
            val id = zone.optString("id")
            val type = zone.optString("type")
            val label = zone.optString("label")
            val geometry = zone.optJSONObject("geometry") ?: return invalid("INVALID_GEOMETRY", "Zone $id has no geometry.")
            val x = geometry.optDouble("x", Double.NaN)
            val y = geometry.optDouble("y", Double.NaN)
            val width = geometry.optDouble("width", Double.NaN)
            val height = geometry.optDouble("height", Double.NaN)
            if (id.isBlank() || !ids.add(id)) return invalid("DUPLICATE_ZONE_ID", "Zone IDs must be present and unique.")
            if (type !in baseWidgets && type !in capabilityWidgets) return invalid("UNSUPPORTED_WIDGET_TYPE", "Widget $type is not supported by this renderer.")
            if (type in capabilityWidgets && type !in enabledCapabilities) return invalid("WIDGET_CAPABILITY_REQUIRED", "Widget $type is unsupported by the enabled device capabilities.")
            if (zone.optInt("schemaVersion", 0) != 1) return invalid("UNSUPPORTED_WIDGET_SCHEMA", "Widget $id uses an unsupported schema version.")
            if (listOf(x, y, width, height).any { !it.isFinite() } || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.0 + 1e-9 || y + height > 1.0 + 1e-9) return invalid("ZONE_OUT_OF_BOUNDS", "Zone $id must remain inside the normalized screen bounds.")
            val fit = zone.optString("fit", "FIT")
            if (fit !in setOf("FIT", "CENTER_CROP")) return invalid("INVALID_FIT", "Zone $id has an unsupported fit mode.")
            if (fit == "CENTER_CROP" && type !in setOf("IMAGE", "VIDEO", "LOGO", "SPONSORED_AD", "BACKGROUND_IMAGE")) return invalid("INVALID_FIT", "Crop is not valid for $type.")
            if (type == "VIDEO") videoCount++
            if (type == "MAIN_AD") mainAdCount++
            if (type == "SPONSORED_AD") sponsorCount++
            if (type in setOf("CLOCK", "WEATHER", "TICKER", "NAVIGATION_MAP", "QR_OFFER")) {
                boundedWidgetCounts[type] = (boundedWidgetCounts[type] ?: 0) + 1
            }
            val binding = zone.optJSONObject("contentBinding") ?: JSONObject()
            val bindingKind = binding.optString("kind", "NONE")
            val referenceId = binding.optString("referenceId").takeIf { it.isNotBlank() && it != "null" }
            if (bindingKind !in setOf("NONE", "APPROVED_CREATIVE", "APPROVED_SPONSOR", "AUTHORIZED_DESTINATION")) return invalid("INVALID_BINDING", "Zone $id has an unsupported content binding.")
            if (bindingKind != "NONE" && referenceId == null) return invalid("INVALID_BINDING", "Zone $id is missing its authorized reference.")
            if (type == "SPONSORED_AD" && bindingKind != "APPROVED_SPONSOR") return invalid("SPONSOR_AUTHORIZATION_REQUIRED", "Sponsored zones require a separately authorized sponsor binding.")
            if (type != "SPONSORED_AD" && bindingKind == "APPROVED_SPONSOR") return invalid("SPONSOR_SLOT_MISMATCH", "Sponsor content cannot be bound to a non-sponsor zone.")
            if (bindingKind == "APPROVED_CREATIVE" && type !in setOf("MAIN_AD", "IMAGE", "VIDEO", "LOGO", "BACKGROUND_IMAGE")) return invalid("CREATIVE_SLOT_MISMATCH", "Approved creative references cannot be attached to $type widgets.")
            if (bindingKind == "AUTHORIZED_DESTINATION" && type != "QR_OFFER") return invalid("DESTINATION_SLOT_MISMATCH", "Authorized destinations can only be attached to QR_OFFER widgets.")
            val zIndex = zone.optInt("zIndex", index)
            if (zIndex !in 0..100) return invalid("INVALID_Z_ORDER", "Zone $id has an unsupported layer order.")
            val visible = zone.optBoolean("visible", true)
            val parsedZone = LayoutStudioZone(id, type, label.ifBlank { type }, x, y, width, height, zIndex, fit, bindingKind, referenceId, visible)
            val targetRect = toPixelRect(parsedZone, targetWidth, targetHeight)
            if (targetRect.width < 1 || targetRect.height < 1) return invalid("ZONE_TOO_SMALL", "Zone $id rounds to zero pixels at its declared target resolution.")
            zones += parsedZone
        }
        if (zones.none { it.visible }) return invalid("NO_VISIBLE_ZONES", "At least one zone must be visible.")
        // Keep Auto Lite at one concurrent video decoder; this matches the existing single-player path.
        if (videoCount > 1 || videoCount + mainAdCount > 1) return invalid("VIDEO_DECODER_BUDGET_EXCEEDED", "At most one possible video playback slot may exist across MAIN_AD and VIDEO zones.")
        if (mainAdCount > 1) return invalid("MULTIPLE_MAIN_AD_ZONES", "A layout may contain at most one primary campaign advertising zone.")
        if (sponsorCount > 1) return invalid("MULTIPLE_SPONSOR_ZONES", "A layout may contain at most one independently authorized sponsor zone.")
        boundedWidgetCounts.entries.firstOrNull { it.value > 1 }?.let { (type, _) ->
            return invalid("WIDGET_BUDGET_EXCEEDED", "A layout may contain at most one $type zone on this renderer.")
        }
        for (left in zones.indices) for (right in left + 1 until zones.size) {
            val a = zones[left]; val b = zones[right]
            if (a.type == "BACKGROUND_IMAGE" || b.type == "BACKGROUND_IMAGE" || a.type in overlays || b.type in overlays) continue
            if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) return invalid("ZONE_OVERLAP", "Zones ${a.id} and ${b.id} overlap.")
        }
        LayoutParseResult.Valid(LayoutStudioContract(1, targetWidth, targetHeight, zones.sortedWith(compareBy<LayoutStudioZone> { it.zIndex }.thenBy { it.id })))
    } catch (_: Exception) {
        invalid("MALFORMED_CONTRACT", "Layout contract could not be parsed safely.")
      }
    }

    /** Round shared edges, not widths independently: adjacent zones stay gap-free and each edge is within 0.5 px. */
    fun toPixelRect(zone: LayoutStudioZone, screenWidth: Int, screenHeight: Int): PixelRect {
        val left = (zone.x * screenWidth).roundToInt().coerceIn(0, screenWidth)
        val top = (zone.y * screenHeight).roundToInt().coerceIn(0, screenHeight)
        val right = ((zone.x + zone.width) * screenWidth).roundToInt().coerceIn(left, screenWidth)
        val bottom = ((zone.y + zone.height) * screenHeight).roundToInt().coerceIn(top, screenHeight)
        return PixelRect(left, top, right, bottom)
    }

    private fun invalid(code: String, detail: String) = LayoutParseResult.Invalid(code, detail)
}
