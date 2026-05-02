package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverStatusViewModelTest {
    @Test
    fun derivesSafeWarningsWithoutSensitiveValues() {
        val state = ReceiverStatusViewModel().buildState(
            notificationAccessEnabled = false,
            listenerConnected = false,
            allowedBanksCount = 1,
            trustedBanksCount = 0,
            queueLength = 55,
            backendReachable = false
        )

        assertEquals(false, state.notificationAccessEnabled)
        assertTrue(state.warnings.contains("notification_access_disabled"))
        assertTrue(state.warnings.contains("listener_disconnected"))
        assertTrue(state.warnings.contains("all_banks_untrusted"))
        assertTrue(state.warnings.contains("queue_backlog_high"))
        assertTrue(state.warnings.contains("backend_unreachable"))
        assertFalse(state.toString().contains("+7"))
        assertFalse(state.toString().contains("raw_notification"))
    }
}
