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

    @Test
    fun operatorDiagnosticsExportContainsSafeStatusOnly() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        store.enqueue(record("evt_safe", OutboxStatus.PENDING_UPLOAD))

        val diagnostics = ReceiverDiagnosticsBuilder().build(
            notificationAccessEnabled = true,
            appNotificationsPermissionEnabled = true,
            listenerConnected = true,
            allowedBanksCount = 1,
            syntheticDebugSourceEnabled = true,
            backendReachable = true,
            lastSignalObservedAt = "2026-05-02T18:00:00.000Z",
            lastUploadStatus = "uploaded without raw phone +79991234567",
            lastSafeErrorSummary = "secret token raw_body api_key password signature notification_text",
            outboxStore = store,
            appVersion = "1.0-debug",
            deviceStatus = "active",
            selectedBankVerificationStatuses = listOf("sber_ru:TO_VERIFY:review_only")
        )

        val exported = ReceiverOperatorDiagnosticsExporter().export(diagnostics)

        assertEquals("1.0-debug", exported.appVersion)
        assertEquals("active", exported.deviceStatus)
        assertEquals(1, exported.selectedBankCount)
        assertEquals(listOf("sber_ru:TO_VERIFY:review_only"), exported.selectedBankVerificationStatuses)
        assertFalse(exported.toString().contains("+79991234567"))
        assertFalse(exported.toString().contains("notification_text", ignoreCase = true))
        assertFalse(exported.toString().contains("api_key", ignoreCase = true))
        assertFalse(exported.toString().contains("password", ignoreCase = true))
        assertFalse(exported.toString().contains("signature", ignoreCase = true))
        assertFalse(exported.toString().contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(exported.toString().contains("bank_confirmed", ignoreCase = true))
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
