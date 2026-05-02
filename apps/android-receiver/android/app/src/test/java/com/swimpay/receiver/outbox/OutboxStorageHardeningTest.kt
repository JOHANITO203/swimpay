package com.swimpay.receiver.outbox

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OutboxStorageHardeningTest {
    private fun record(
        eventId: String,
        status: OutboxStatus = OutboxStatus.PENDING_UPLOAD,
        firstSeenAt: String = "2026-05-02T20:00:00.000Z",
        ackReceivedAt: String? = null
    ): OutboxRecord = OutboxRecord(
        localId = "outbox_$eventId",
        eventId = eventId,
        notificationHash = "hash_$eventId",
        semanticHash = "semantic_$eventId",
        payloadHash = "payload_hash_$eventId",
        encryptedPayload = """{"redacted_body":"Synthetic <PHONE> <REFERENCE>"}""",
        status = status,
        attemptCount = 0,
        firstSeenAt = firstSeenAt,
        lastAttemptAt = null,
        nextRetryAt = null,
        ackReceivedAt = ackReceivedAt
    )

    @Test
    fun protectedStorageEncryptsValuesAndDoesNotStorePlainPayload() {
        val protected = InMemoryProtectedKeyValueStore()
        val adapter = ProtectedOutboxStorageAdapter(protected, deterministicProtector = XorStringProtector("key"))
        val entry = record("evt_secure")

        adapter.write(entry.eventId, entry)

        val rawStoredValue = protected.dump().values.single()
        assertFalse(rawStoredValue.contains("redacted_body"))
        assertFalse(rawStoredValue.contains("Synthetic"))
        assertEquals(entry, adapter.read("evt_secure"))
    }

    @Test
    fun migrationDedupesAndDoesNotDuplicateEntries() {
        val source = FakeEncryptedStorageAdapter()
        val target = FakeEncryptedStorageAdapter()
        val sourceStore = AndroidEncryptedOutboxStore(source)
        sourceStore.enqueue(record("evt_1"))
        sourceStore.enqueue(record("evt_2").copy(notificationHash = "hash_evt_1"))

        val migrated = OutboxMigration.migrate(source, target)

        assertEquals(1, migrated)
        assertEquals(1, target.readAll().size)
    }

    @Test
    fun cleanupPurgesOldAckedAndExpiredEntries() {
        val storage = FakeEncryptedStorageAdapter()
        val store = AndroidEncryptedOutboxStore(storage)
        store.enqueue(record("evt_old_acked", status = OutboxStatus.ACKED, ackReceivedAt = "2026-05-01T00:00:00.000Z"))
        store.enqueue(record("evt_expired", status = OutboxStatus.EXPIRED, firstSeenAt = "2026-05-01T00:00:00.000Z"))
        store.enqueue(record("evt_pending"))

        val removed = store.cleanup(
            nowIso = "2026-05-03T00:00:00.000Z",
            retentionMs = OutboxRetention.ACKED_RETENTION_MS
        )

        assertEquals(2, removed)
        assertNull(storage.read("evt_old_acked"))
        assertNull(storage.read("evt_expired"))
        assertEquals(listOf("evt_pending"), storage.readAll().map { it.eventId })
    }

    @Test
    fun storageRejectsRawTitleBodyAndSecrets() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())

        val rawTitle = runCatching { store.enqueue(record("evt_raw_title").copy(encryptedPayload = "raw_title: hello")) }
        val rawBody = runCatching { store.enqueue(record("evt_raw_body").copy(encryptedPayload = "raw_body: hello")) }
        val secret = runCatching { store.enqueue(record("evt_secret").copy(encryptedPayload = "token=abc")) }

        assertTrue(rawTitle.isFailure)
        assertTrue(rawBody.isFailure)
        assertTrue(secret.isFailure)
    }
}
