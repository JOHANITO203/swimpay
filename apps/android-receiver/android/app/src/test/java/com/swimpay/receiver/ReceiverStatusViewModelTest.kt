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
        assertEquals(ReceiverRuntimeState.OFFLINE, state.runtimeState)
        assertFalse(state.toString().contains("+7"))
        assertFalse(state.toString().contains("raw_notification"))
    }

    @Test
    fun derivesReceiverRuntimeStatesForMerchantUi() {
        val viewModel = ReceiverStatusViewModel()

        assertEquals(
            ReceiverRuntimeState.LISTENING,
            viewModel.buildState(
                notificationAccessEnabled = true,
                listenerConnected = true,
                allowedBanksCount = 2,
                trustedBanksCount = 2,
                queueLength = 0,
                backendReachable = true
            ).runtimeState
        )
        assertEquals(
            ReceiverRuntimeState.DEGRADED,
            viewModel.buildState(
                notificationAccessEnabled = false,
                listenerConnected = false,
                allowedBanksCount = 2,
                trustedBanksCount = 0,
                queueLength = 0,
                backendReachable = true
            ).runtimeState
        )
        assertEquals(
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED,
            viewModel.buildState(
                notificationAccessEnabled = true,
                listenerConnected = true,
                allowedBanksCount = 2,
                trustedBanksCount = 2,
                queueLength = 50,
                backendReachable = true
            ).runtimeState
        )
        assertEquals(
            ReceiverRuntimeState.OFFLINE,
            viewModel.buildState(
                notificationAccessEnabled = true,
                listenerConnected = true,
                allowedBanksCount = 2,
                trustedBanksCount = 2,
                queueLength = 0,
                backendReachable = false
            ).runtimeState
        )
    }
}
