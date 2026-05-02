package com.swimpay.receiver.outbox

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidEncryptedOutboxStoreTest {
    private fun record(eventId: String = "evt_1", status: OutboxStatus = OutboxStatus.PENDING_UPLOAD): OutboxRecord {
        return OutboxRecord(
            localId = "outbox_$eventId",
            eventId = eventId,
            notificationHash = "hash_$eventId",
            semanticHash = "semantic_$eventId",
            payloadHash = "payload_hash_$eventId",
            encryptedPayload = "encrypted_redacted_payload_$eventId",
            status = status,
            attemptCount = 0,
            firstSeenAt = "2026-05-02T00:00:00.000Z",
            lastAttemptAt = null,
            nextRetryAt = null,
            ackReceivedAt = null
        )
    }

    @Test
    fun enqueueDedupesByEventId() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())

        val first = store.enqueue(record())
        val second = store.enqueue(record(status = OutboxStatus.CAPTURED))

        assertEquals(first, second)
        assertEquals(listOf(first), store.dueRecords("2026-05-02T00:00:01.000Z"))
    }

    @Test
    fun transitionsUploadStates() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        store.enqueue(record())

        assertEquals(OutboxStatus.UPLOADING, store.markUploading("evt_1")?.status)
        assertEquals(OutboxStatus.ACKED, store.markAcked("evt_1", "2026-05-02T00:00:01.000Z")?.status)
        assertNull(store.markUploading("missing"))
    }

    @Test
    fun rejectsObviousRawSensitiveValues() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        val rawPhone = runCatching { store.enqueue(record().copy(encryptedPayload = "contains +79991234567")) }
        val rawNotification = runCatching { store.enqueue(record("evt_2").copy(encryptedPayload = "raw_notification text")) }

        assertTrue(rawPhone.isFailure)
        assertTrue(rawNotification.isFailure)
    }

    @Test
    fun reloadRestoresPendingRecordsAndDedupesByNotificationHash() {
        val storage = FakeEncryptedStorageAdapter()
        val firstStore = AndroidEncryptedOutboxStore(storage)
        val first = firstStore.enqueue(record(eventId = "evt_1"))
        val duplicateHash = firstStore.enqueue(
            record(eventId = "evt_2").copy(notificationHash = first.notificationHash)
        )

        val reloadedStore = AndroidEncryptedOutboxStore(storage)
        val due = reloadedStore.dueRecords("2026-05-02T00:00:01.000Z")

        assertEquals(first, duplicateHash)
        assertEquals(listOf(first), due)
    }

    @Test
    fun failureSchedulesRetryAckSetsTimestampAndExpiredRecordsAreNotDue() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        store.enqueue(record(eventId = "evt_1"))
        store.enqueue(record(eventId = "evt_expired").copy(status = OutboxStatus.EXPIRED))

        val failed = store.markFailedRetrying(
            eventId = "evt_1",
            sanitizedError = "backend unreachable",
            nextRetryAt = "2026-05-02T00:02:00.000Z",
            lastAttemptAt = "2026-05-02T00:01:00.000Z"
        )

        assertEquals(1, failed?.attemptCount)
        assertEquals("2026-05-02T00:02:00.000Z", failed?.nextRetryAt)
        assertEquals(emptyList<OutboxRecord>(), store.dueRecords("2026-05-02T00:01:30.000Z"))
        assertEquals(listOf(failed), store.dueRecords("2026-05-02T00:03:00.000Z"))

        val acked = store.markAcked("evt_1", "2026-05-02T00:04:00.000Z")

        assertEquals(OutboxStatus.ACKED, acked?.status)
        assertEquals("2026-05-02T00:04:00.000Z", acked?.ackReceivedAt)
    }
}
