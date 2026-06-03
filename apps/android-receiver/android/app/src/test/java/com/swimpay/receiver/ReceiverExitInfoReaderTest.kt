package com.swimpay.receiver

import android.app.ApplicationExitInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverExitInfoReaderTest {
    @Test
    fun mapsCommonKillAndCrashReasons() {
        assertEquals("low_memory", ReceiverExitInfoReader.describeReason(ApplicationExitInfo.REASON_LOW_MEMORY))
        assertEquals("crash", ReceiverExitInfoReader.describeReason(ApplicationExitInfo.REASON_CRASH))
        assertEquals("crash_native", ReceiverExitInfoReader.describeReason(ApplicationExitInfo.REASON_CRASH_NATIVE))
        assertEquals("anr", ReceiverExitInfoReader.describeReason(ApplicationExitInfo.REASON_ANR))
        assertEquals("signaled", ReceiverExitInfoReader.describeReason(ApplicationExitInfo.REASON_SIGNALED))
    }

    @Test
    fun fallsBackForUnmappedReason() {
        assertTrue(ReceiverExitInfoReader.describeReason(99999).startsWith("unmapped_"))
    }
}
