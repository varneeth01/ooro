package com.ooro.screenplayer.layoutstudio

import com.ooro.screenplayer.eligibleSponsoredItem
import com.ooro.screenplayer.manifestIsAuthorizedAt
import com.ooro.screenplayer.model.CreativeType
import com.ooro.screenplayer.model.DeviceManifest
import com.ooro.screenplayer.model.ManifestItem
import com.ooro.screenplayer.player.ScheduleEngine
import java.time.Instant
import java.time.ZoneId

/** A resolved, manifest-backed payload. This type carries no authority to create proof by itself. */
sealed interface CustomWidgetContent {
    val proofSlot: String?
    data class MainAd(val item: ManifestItem) : CustomWidgetContent { override val proofSlot = "MAIN" }
    data class Sponsor(val item: ManifestItem) : CustomWidgetContent { override val proofSlot = "SPONSORED" }
    data class DecorativeMedia(val item: ManifestItem) : CustomWidgetContent { override val proofSlot: String? = null }
    data class Offer(val item: ManifestItem) : CustomWidgetContent { override val proofSlot: String? = null }
    data class Text(val value: String) : CustomWidgetContent { override val proofSlot: String? = null }
    data class Fallback(val reason: String) : CustomWidgetContent { override val proofSlot: String? = null }
}

/**
 * Resolves Layout Studio references only through the currently authorized device manifest.
 * It never fetches media, selects campaigns, extends a lease, or attributes a proof.
 */
internal fun resolveCustomWidgetContent(
    zone: LayoutStudioZone,
    manifest: DeviceManifest,
    pairedScreenId: String?,
    verifiedItemIds: Set<String>,
    currentMainItem: ManifestItem?,
    now: Instant,
    enabledCapabilities: Set<String> = emptySet(),
): CustomWidgetContent {
    if (pairedScreenId.isNullOrBlank() || manifest.screenId != pairedScreenId) return CustomWidgetContent.Fallback("screen-identity-mismatch")
    if (!manifestIsAuthorizedAt(manifest, now)) return CustomWidgetContent.Fallback("manifest-expired")
    if (!zone.visible) return CustomWidgetContent.Fallback("hidden")
    val binding = zone.bindingKind
    val reference = zone.referenceId
    val zoneId = runCatching { ZoneId.of(manifest.timezone) }.getOrDefault(ZoneId.of("UTC"))
    fun activeAndVerified(item: ManifestItem?) = item?.takeIf {
        it.id in verifiedItemIds && it.isActive(now, zoneId)
    }

    return when (zone.type) {
        "MAIN_AD" -> {
            val item = activeAndVerified(currentMainItem)
            if (item != null && (binding == "NONE" || binding == "APPROVED_CREATIVE" && reference == item.creativeId)) CustomWidgetContent.MainAd(item)
            else CustomWidgetContent.Fallback("no-authorized-main-creative")
        }
        "SPONSORED_AD" -> {
            val sponsor = eligibleSponsoredItem(manifest, now, verifiedItemIds)
            if (binding == "APPROVED_SPONSOR" && reference != null && sponsor?.creativeId == reference) CustomWidgetContent.Sponsor(sponsor)
            else CustomWidgetContent.Fallback("no-eligible-sponsor")
        }
        "IMAGE", "VIDEO", "LOGO", "BACKGROUND_IMAGE" -> {
            if (binding != "APPROVED_CREATIVE" || reference == null) return CustomWidgetContent.Fallback("creative-binding-required")
            val expectedType = if (zone.type == "VIDEO") CreativeType.VIDEO else CreativeType.IMAGE
            val selected = ScheduleEngine().eligible(manifest, now)
                .firstOrNull { it.creativeId == reference && it.type == expectedType && it.id in verifiedItemIds }
            if (selected == null) CustomWidgetContent.Fallback("creative-not-eligible-or-verified")
            else CustomWidgetContent.DecorativeMedia(selected)
        }
        "QR_OFFER" -> {
            if (binding != "AUTHORIZED_DESTINATION" || reference == null) return CustomWidgetContent.Fallback("destination-binding-required")
            val item = ScheduleEngine().eligible(manifest, now).firstOrNull {
                it.id in verifiedItemIds && it.offer.authorizedDestinationId == reference && it.offer.authorizedQrUrl != null
            }
            if (item == null) CustomWidgetContent.Fallback("destination-not-authorized-or-verified") else CustomWidgetContent.Offer(item)
        }
        "TEXT" -> if (binding == "NONE") CustomWidgetContent.Text(zone.label) else CustomWidgetContent.Fallback("text-cannot-bind-campaign-content")
        "CLOCK", "WEATHER", "TICKER", "NAVIGATION_MAP" -> if (zone.type in enabledCapabilities) {
            CustomWidgetContent.Fallback("capability-enabled-widget-has-no-runtime-provider")
        } else CustomWidgetContent.Fallback("device-capability-unavailable")
        else -> CustomWidgetContent.Fallback("unsupported-widget")
    }
}
