package com.ooro.screenplayer.player

import com.ooro.screenplayer.model.*
import java.time.Instant
import java.time.ZoneId

class ScheduleEngine {
    private val lastBuckets = mutableMapOf<String, Long>()
    private fun key(item: ManifestItem) = "${item.scheduleId ?: item.campaignId}:${item.sequence}"
    private fun bucket(item: ManifestItem, now: Instant) = kotlin.math.floor(now.epochSecond / item.intervalSeconds).toLong()
    fun recordStarted(item: ManifestItem, now: Instant = Instant.now()) {
        if (item.intervalSeconds > 0) lastBuckets[key(item)] = bucket(item, now)
    }
    fun eligible(manifest: DeviceManifest, now: Instant = Instant.now()): List<ManifestItem> {
        val active = manifest.items.filter { it.isActive(now, ZoneId.of(manifest.timezone)) }
        val emergency = active.filter { it.priority >= 1000 }
        val exclusive = active.filter { it.exclusive }.sortedWith(compareByDescending<ManifestItem> { it.priority }.thenBy { it.campaignId })
        val candidates = when {
            emergency.isNotEmpty() -> emergency
            exclusive.isNotEmpty() -> active.filter { it.campaignId == exclusive.first().campaignId }
            active.any { it.priority > 0 } -> active.filter { it.priority > 0 }
            else -> active
        }
        val due = candidates.filter { it.intervalSeconds <= 0 || lastBuckets[key(it)] != bucket(it, now) }
        // House material fills gaps between paced paid placements.
        val result = if (due.isEmpty() && emergency.isEmpty() && exclusive.isEmpty()) active.filter { it.priority == 0 } else due
        return result.sortedWith(compareByDescending<ManifestItem> { it.priority }.thenBy { it.campaignId }.thenBy { it.sequence }.thenBy { it.id })
    }
    fun next(manifest: DeviceManifest, now: Instant = Instant.now(), offset: Int = 0): ManifestItem? {
        val eligible = eligible(manifest, now)
        val paced = eligible.filter { it.intervalSeconds > 0 }
        val items = (if (paced.isNotEmpty()) paced else eligible).flatMap { item -> List(item.playsPerLoop.coerceIn(1, 28)) { item } }
        return items.takeIf { it.isNotEmpty() }?.let { it[offset.mod(it.size)] }
    }
}
