package com.swimpay.receiver

import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.FakeEncryptedStorageAdapter
import com.swimpay.receiver.outbox.OutboxRecord
import com.swimpay.receiver.outbox.OutboxStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverDiagnosticsTest {
    @Test
    fun diagnosticsSummarizeOutboxAndListenerWithoutPii() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        store.enqueue(record("evt_pending", OutboxStatus.PENDING_UPLOAD))
        store.enqueue(record("evt_failed", OutboxStatus.PENDING_UPLOAD))
        store.markFailedRetrying(
            eventId = "evt_failed",
            sanitizedError = "backend unreachable",
            nextRetryAt = "2026-05-02T18:05:00.000Z",
            lastAttemptAt = "2026-05-02T18:00:00.000Z"
        )

        val diagnostics = ReceiverDiagnosticsBuilder().build(
            notificationAccessEnabled = true,
            appNotificationsPermissionEnabled = true,
            listenerConnected = true,
            allowedBanksCount = 1,
            syntheticDebugSourceEnabled = true,
            backendReachable = true,
            lastSignalObservedAt = "2026-05-02T18:00:00.000Z",
            lastUploadStatus = "notification signal accepted; backend decision pending",
            lastSafeErrorSummary = "failed for +79991234567 raw_notification token",
            outboxStore = store
        )

        assertTrue(diagnostics.notificationAccessEnabled)
        assertTrue(diagnostics.appNotificationsPermissionEnabled)
        assertTrue(diagnostics.listenerConnected)
        assertTrue(diagnostics.syntheticDebugSourceEnabled)
        assertEquals(1, diagnostics.outboxPendingCount)
        assertEquals(1, diagnostics.outboxFailedRetryingCount)
        assertTrue(diagnostics.lastUploadStatus.contains("backend decision pending"))
        assertFalse(diagnostics.lastSafeErrorSummary.contains("+79991234567"))
        assertFalse(diagnostics.lastSafeErrorSummary.contains("raw_notification", ignoreCase = true))
        assertFalse(diagnostics.toString().contains("bank_confirmed", ignoreCase = true))
        assertFalse(diagnostics.toString().contains("official_bank_confirmation"))
    }

    @Test
    fun diagnosticsCanRepresentDisabledSyntheticDebugSource() {
        val diagnostics = ReceiverDiagnosticsBuilder().build(
            notificationAccessEnabled = false,
            appNotificationsPermissionEnabled = false,
            listenerConnected = false,
            allowedBanksCount = 0,
            syntheticDebugSourceEnabled = false,
            backendReachable = false,
            lastSignalObservedAt = null,
            lastUploadStatus = null,
            lastSafeErrorSummary = null,
            outboxStore = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        )

        assertFalse(diagnostics.syntheticDebugSourceEnabled)
        assertEquals("never", diagnostics.lastSignalObservedAt)
        assertEquals("no upload yet", diagnostics.lastUploadStatus)
        assertEquals("none", diagnostics.lastSafeErrorSummary)
    }

    private fun record(eventId: String, status: OutboxStatus): OutboxRecord {
        return OutboxRecord(
            localId = "outbox_$eventId",
            eventId = eventId,
            notificationHash = "hash_$eventId",
            semanticHash = "semantic_$eventId",
            payloadHash = "payload_hash_$eventId",
            encryptedPayload = """{"event_id":"$eventId","redacted_body":"<PHONE> <REFERENCE>"}""",
            status = status,
            attemptCount = 0,
            firstSeenAt = "2026-05-02T18:00:00.000Z",
            lastAttemptAt = null,
            nextRetryAt = null,
            ackReceivedAt = null
        )
    }
}
