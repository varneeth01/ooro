package com.ooro.screenplayer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RepairAccessCodeTest {
    @Test fun configuredTechnicianCodeIsAccepted() {
        assertTrue(isRepairAccessCode("123456", "123456"))
        assertTrue(isRepairAccessCode("123456u", "123456"))
    }

    @Test fun otherCodesAreRejected() {
        assertFalse(isRepairAccessCode("123457", "123456"))
        assertFalse(isRepairAccessCode(""))
    }
}
