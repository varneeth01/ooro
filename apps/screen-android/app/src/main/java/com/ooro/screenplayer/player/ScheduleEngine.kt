package com.ooro.screenplayer.player

import com.ooro.screenplayer.model.*
import java.time.Instant
import java.time.ZoneId

class ScheduleEngine {
    fun eligible(manifest: DeviceManifest, now: Instant = Instant.now()): List<ManifestItem> = manifest.items.filter { it.isActive(now, ZoneId.of(manifest.timezone)) }.sortedWith(compareByDescending<ManifestItem> { it.priority }.thenBy { it.id })
    fun next(manifest: DeviceManifest, now: Instant = Instant.now(), offset: Int = 0): ManifestItem? { val items = eligible(manifest, now); return items.takeIf { it.isNotEmpty() }?.let { it[offset.mod(it.size)] } }
}
