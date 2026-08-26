package com.ooro.screenplayer

import com.ooro.screenplayer.model.*
import com.ooro.screenplayer.player.ScheduleEngine
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

class ManifestTest { @Test fun priorityOrdersRotation() { val low = ManifestItem("b", "c", "b", CreativeType.IMAGE, "", null, 1, 1, null, null, emptySet(), null, null); val high = low.copy(id = "a", priority = 2); val result = ScheduleEngine().eligible(DeviceManifest(1, "s", "UTC", listOf(low, high), null), Instant.parse("2026-08-22T00:00:00Z")); assertEquals(listOf("a", "b"), result.map { it.id }) } }
