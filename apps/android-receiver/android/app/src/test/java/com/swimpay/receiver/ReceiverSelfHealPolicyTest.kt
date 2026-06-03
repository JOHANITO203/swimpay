package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverSelfHealPolicyTest {
    @Test
    fun healthyWhenAccessGrantedAndListenerConnected() {
        val decision = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = true,
                listenerConnected = true,
                lastDisconnectedAtIso = null,
                nowIso = "2026-06-03T10:00:00.000Z"
            )
        )

        assertFalse(decision.shouldRequestRebind)
        assertFalse(decision.shouldAlertMerchantOffline)
        assertNull(decision.offlineDurationMs)
        assertEquals("healthy", decision.reason)
    }

    @Test
    fun rebindsWithoutAlertWhenDisconnectedBriefly() {
        val decision = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = true,
                listenerConnected = false,
                lastDisconnectedAtIso = "2026-06-03T09:58:00.000Z",
                nowIso = "2026-06-03T10:00:00.000Z"
            )
        )

        assertTrue(decision.shouldRequestRebind)
        assertFalse(decision.shouldAlertMerchantOffline)
        assertEquals(120_000L, decision.offlineDurationMs)
        assertEquals("listener_disconnected_rebinding", decision.reason)
    }

    @Test
    fun rebindsAndAlertsWhenDisconnectedPastThreshold() {
        val decision = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = true,
                listenerConnected = false,
                lastDisconnectedAtIso = "2026-06-03T09:54:00.000Z",
                nowIso = "2026-06-03T10:00:00.000Z"
            )
        )

        assertTrue(decision.shouldRequestRebind)
        assertTrue(decision.shouldAlertMerchantOffline)
        assertEquals(360_000L, decision.offlineDurationMs)
        assertEquals("listener_disconnected_over_threshold", decision.reason)
    }

    @Test
    fun alertsAndDoesNotRebindWhenAccessRevoked() {
        val decision = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = false,
                listenerConnected = false,
                lastDisconnectedAtIso = "2026-06-03T09:54:00.000Z",
                nowIso = "2026-06-03T10:00:00.000Z"
            )
        )

        assertFalse(decision.shouldRequestRebind)
        assertTrue(decision.shouldAlertMerchantOffline)
        assertEquals("notification_access_revoked", decision.reason)
    }

    @Test
    fun rebindsWithoutAlertWhenDisconnectTimestampMissing() {
        val decision = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = true,
                listenerConnected = false,
                lastDisconnectedAtIso = null,
                nowIso = "2026-06-03T10:00:00.000Z"
            )
        )

        assertTrue(decision.shouldRequestRebind)
        assertFalse(decision.shouldAlertMerchantOffline)
        assertNull(decision.offlineDurationMs)
    }
}
