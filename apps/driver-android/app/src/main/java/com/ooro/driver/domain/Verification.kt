package com.ooro.driver.domain

class RideVerificationEngine(private val minimumScore: Int = 70) {
    fun verify(events: List<NormalizedRideEvent>, locations: List<LocationSample>, display: DisplayBinding?): VerificationResult {
        val reasons = mutableSetOf<VerificationReason>(); var score = 0
        if (events.any { it.eventType == RideEventType.PASSENGER_PICKED_UP || it.eventType == RideEventType.PICKUP_DETECTED }) { score += 30; reasons += VerificationReason.NORMAL_EVENT_SEQUENCE }
        if (locations.size >= 2 && locations.zipWithNext().all { distance(it.first, it.second) < 2_000 }) { score += 25; reasons += VerificationReason.GPS_CONSISTENT }
        if (locations.any { it.accuracyMeters <= 100f && (it.speedMps ?: 0f) > 0.5f }) { score += 20; reasons += VerificationReason.VALID_MOVEMENT } else reasons += VerificationReason.NO_MOVEMENT
        if (display != null && display.state == DisplayState.ACTIVE_PLAYBACK) { score += 25; reasons += VerificationReason.DISPLAY_ACTIVE } else reasons += VerificationReason.DISPLAY_OFFLINE
        val status = when { score >= minimumScore -> VerificationStatusV2.VERIFIED; score >= 45 -> VerificationStatusV2.SUSPICIOUS; else -> VerificationStatusV2.REJECTED }
        return VerificationResult(score, status, reasons)
    }
    private fun distance(a: LocationSample, b: LocationSample): Double { val lat = Math.toRadians(b.latitude - a.latitude); val lon = Math.toRadians(b.longitude - a.longitude); val h = kotlin.math.sin(lat / 2) * kotlin.math.sin(lat / 2) + kotlin.math.cos(Math.toRadians(a.latitude)) * kotlin.math.cos(Math.toRadians(b.latitude)) * kotlin.math.sin(lon / 2) * kotlin.math.sin(lon / 2); return 6_371_000 * 2 * kotlin.math.asin(kotlin.math.sqrt(h)) }
}
