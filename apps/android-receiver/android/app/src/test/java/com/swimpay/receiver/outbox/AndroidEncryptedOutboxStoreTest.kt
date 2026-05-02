package com.swimpay.receiver.outbox

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidEncryptedOutboxStoreTest {
    private fun record(eventId: String = "evt_1", status: OutboxStatus = OutboxStatus.PENDING_UPLOAD): OutboxRecord {
        return OutboxRecord(
            eventId = eventId,
            notificationHash = "hash_$eventId",
            encryptedPayload = "encrypted_redacted_payload_$eventId",
            status = status,
            attemptCount = 0,
            firstSeenAt = "2026-05-02T00:00:00.000Z",
            nextRetryAt = null
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
        assertEquals(OutboxStatus.ACKED, store.markAcked("evt_1")?.status)
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
}
