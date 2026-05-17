package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverListenerLifecycleStoreTest {
    @Test
    fun marksListenerConnectionAndDisconnectionWithoutSensitiveData() {
        val store = ReceiverListenerLifecycleStore(InMemoryReceiverListenerLifecycleStorage())

        store.markConnected("2026-05-17T10:00:00.000Z")

        val connected = store.load()
        assertTrue(connected.connected)
        assertEquals("2026-05-17T10:00:00.000Z", connected.lastConnectedAt)
        assertEquals(null, connected.lastDisconnectedAt)
        assertTrue(store.isConnectedRecently("2026-05-17T10:01:00.000Z"))

        store.markDisconnected("2026-05-17T10:02:00.000Z")

        val disconnected = store.load()
        assertFalse(disconnected.connected)
        assertEquals("2026-05-17T10:00:00.000Z", disconnected.lastConnectedAt)
        assertEquals("2026-05-17T10:02:00.000Z", disconnected.lastDisconnectedAt)
        assertFalse(store.isConnectedRecently("2026-05-17T10:02:05.000Z"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsRawNotificationMarkersInLifecycleStorage() {
        ReceiverListenerLifecycleStore(InMemoryReceiverListenerLifecycleStorage()).saveForTest(
            ReceiverListenerLifecycleState(
                connected = true,
                lastConnectedAt = "raw_notification_text",
                lastDisconnectedAt = null
            )
        )
    }
}
