package com.ooro.screenplayer

import com.ooro.screenplayer.model.PlaybackSession
import com.ooro.screenplayer.player.PlaybackStateTracker
import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class PlaybackStateTrackerTest {
    private fun session(item: String) = PlaybackSession("event-$item", item, "campaign-$item", "creative-$item", "asset-$item", Instant.EPOCH, 10_000)

    @Test fun recompositionCannotDuplicateStartOrCompletion() {
        val tracker = PlaybackStateTracker()
        assertTrue(tracker.start(session("a")))
        assertFalse(tracker.start(session("a")))
        assertEquals("event-a", tracker.finish("a")?.eventId)
        assertNull(tracker.finish("a"))
    }

    @Test fun staleCompletionCannotFinishTheNextCreative() {
        val tracker = PlaybackStateTracker()
        assertTrue(tracker.start(session("a")))
        assertNull(tracker.finish("b"))
        assertEquals("a", tracker.current?.itemId)
    }
}
