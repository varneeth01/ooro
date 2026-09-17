package com.ooro.screenplayer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RepairAccessCodeTest {
    @Test fun configuredTechnicianCodeIsAccepted() {
        assertTrue(isRepairAccessCode("798162"))
        assertTrue(isRepairAccessCode("798162u"))
    }

    @Test fun otherCodesAreRejected() {
        assertFalse(isRepairAccessCode("798163"))
        assertFalse(isRepairAccessCode(""))
    }
}
