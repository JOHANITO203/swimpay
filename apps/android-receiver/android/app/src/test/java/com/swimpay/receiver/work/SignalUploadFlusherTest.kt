package com.swimpay.receiver.work

import com.swimpay.receiver.InMemoryDeviceStateStorage
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverDeviceState
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.FakeEncryptedStorageAdapter
import com.swimpay.receiver.outbox.OutboxRecord
import com.swimpay.receiver.outbox.OutboxStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SignalUploadFlusherTest {
    @Test
    fun uploadsDueNonDebugOutboxPayloadAndAcksSuccess() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        store.enqueue(redactedRecord())
        val transport = RecordingSignalTransport(statusCode = 202)

        val result = SignalUploadFlusher(
            outboxStore = store,
            transport = transport,
            nowIso = { "2026-05-08T12:00:00.000Z" },
            nextRetryIso = { "2026-05-08T12:01:00.000Z" }
        ).flushDue()

        assertTrue(result.success)
        assertEquals(1, result.acked)
        assertEquals(0, result.failedRetrying)
        assertEquals(1, transport.requests.size)
        assertEquals("POST", transport.requests.single().method)
        assertEquals("/v1/receiver/signals", transport.requests.single().path)
        assertEquals(redactedPayload(), transport.requests.single().body)
        assertEquals(emptyList<OutboxRecord>(), store.dueRecords("2026-05-08T12:02:00.000Z"))
    }

    @Test
    fun keepsDuePayloadForRetryAfterSafeUploadFailure() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        store.enqueue(redactedRecord())
        val transport = RecordingSignalTransport(statusCode = 503)

        val result = SignalUploadFlusher(
            outboxStore = store,
            transport = transport,
            nowIso = { "2026-05-08T12:00:00.000Z" },
            nextRetryIso = { "2026-05-08T12:01:00.000Z" }
        ).flushDue()

        assertFalse(result.success)
        assertEquals(0, result.acked)
        assertEquals(1, result.failedRetrying)
        val dueBeforeRetry = store.dueRecords("2026-05-08T12:00:30.000Z")
        assertEquals(0, dueBeforeRetry.size)
        val retryDue = store.dueRecords("2026-05-08T12:01:00.000Z").single()
        assertEquals(OutboxStatus.FAILED_RETRYING, retryDue.status)
        assertEquals(1, retryDue.attemptCount)
        assertEquals("2026-05-08T12:00:00.000Z", retryDue.lastAttemptAt)
        assertEquals("2026-05-08T12:01:00.000Z", retryDue.nextRetryAt)
    }

    @Test
    fun doesNotSendUnsafeRawPayloadAndKeepsRecordForRetry() {
        val store = UnsafeOutboxStore(
            redactedRecord().copy(
                encryptedPayload = """{"event_id":"evt_runtime_01","raw_title":"Transfer from +79991234567"}"""
            )
        )
        val transport = RecordingSignalTransport(statusCode = 202)

        val result = SignalUploadFlusher(
            outboxStore = store,
            transport = transport,
            nowIso = { "2026-05-08T12:00:00.000Z" },
            nextRetryIso = { "2026-05-08T12:01:00.000Z" }
        ).flushDue()

        assertFalse(result.success)
        assertEquals(0, result.acked)
        assertEquals(1, result.failedRetrying)
        assertEquals(0, transport.requests.size)
        val retryDue = store.dueRecords("2026-05-08T12:01:00.000Z").single()
        assertEquals(OutboxStatus.FAILED_RETRYING, retryDue.status)
        assertEquals(1, retryDue.attemptCount)
    }

    @Test
    fun blocksRawCardKeysBeforeTransport() {
        val store = UnsafeOutboxStore(
            redactedRecord().copy(
                encryptedPayload = """{"event_id":"evt_runtime_01","card_number":"2202201234567890"}"""
            )
        )
        val transport = RecordingSignalTransport(statusCode = 202)

        val result = SignalUploadFlusher(
            outboxStore = store,
            transport = transport,
            nowIso = { "2026-05-08T12:00:00.000Z" },
            nextRetryIso = { "2026-05-08T12:01:00.000Z" }
        ).flushDue()

        assertFalse(result.success)
        assertEquals(0, result.acked)
        assertEquals(1, result.failedRetrying)
        assertEquals(0, transport.requests.size)
    }

    @Test
    fun allowsExplicitRawTextPresentFalseFlagButRejectsTrue() {
        val safeStore = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        safeStore.enqueue(
            redactedRecord().copy(
                encryptedPayload = """{"event_id":"evt_runtime_01","raw_text_present":false,"redacted_text":"<AMOUNT> <PHONE>","signature":"sig_runtime_01"}"""
            )
        )
        val transport = RecordingSignalTransport(statusCode = 202)

        val safe = SignalUploadFlusher(
            outboxStore = safeStore,
            transport = transport,
            nowIso = { "2026-05-08T12:00:00.000Z" },
            nextRetryIso = { "2026-05-08T12:01:00.000Z" }
        ).flushDue()

        assertTrue(safe.success)
        assertEquals(1, transport.requests.size)

        val unsafeStore = UnsafeOutboxStore(
            redactedRecord().copy(
                encryptedPayload = """{"event_id":"evt_runtime_02","raw_text_present":true,"redacted_text":"<AMOUNT>","signature":"sig_runtime_02"}"""
            )
        )
        val unsafeTransport = RecordingSignalTransport(statusCode = 202)

        val unsafe = SignalUploadFlusher(
            outboxStore = unsafeStore,
            transport = unsafeTransport,
            nowIso = { "2026-05-08T12:00:00.000Z" },
            nextRetryIso = { "2026-05-08T12:01:00.000Z" }
        ).flushDue()

        assertFalse(unsafe.success)
        assertEquals(0, unsafeTransport.requests.size)
    }

    @Test
    fun acceptsPersistedHttpsStagingBackendBaseUrlForRuntimeUpload() {
        val deviceStateStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())

        deviceStateStore.save(
            ReceiverDeviceState(
                deviceId = "dev_runtime_01",
                deviceStatus = "active",
                serverTime = null,
                appVersion = "0.1.0-test",
                lastRegistrationAt = "2026-05-08T00:00:00.000Z",
                lastHeartbeatAt = null,
                backendBaseUrl = "https://staging.swimpay.pro"
            )
        )

        val state = deviceStateStore.load()

        assertEquals("https://staging.swimpay.pro", state?.backendBaseUrl)
    }

    private fun redactedRecord(): OutboxRecord {
        return OutboxRecord(
            localId = "outbox_evt_runtime_01",
            eventId = "evt_runtime_01",
            notificationHash = "notification_hash_runtime_01",
            semanticHash = "semantic_hash_runtime_01",
            payloadHash = "payload_hash_runtime_01",
            encryptedPayload = redactedPayload(),
            status = OutboxStatus.PENDING_UPLOAD,
            attemptCount = 0,
            firstSeenAt = "2026-05-08T11:59:00.000Z",
            lastAttemptAt = null,
            nextRetryAt = null,
            ackReceivedAt = null
        )
    }

    private fun redactedPayload(): String {
        return """{"event_id":"evt_runtime_01","confirmation_type":"notification_signal","official_bank_confirmation":false,"raw_text_present":false,"redacted_text":"Incoming transfer <AMOUNT> <CURRENCY> from <PHONE>","signature":"sig_runtime_01"}"""
    }
}

private class RecordingSignalTransport(
    private val statusCode: Int
) : SignalUploadTransport {
    val requests = mutableListOf<SignalUploadRequest>()

    override fun execute(request: SignalUploadRequest): SignalUploadResponse {
        requests += request
        return SignalUploadResponse(statusCode = statusCode, body = "{}")
    }
}

private class UnsafeOutboxStore(initialRecord: OutboxRecord) : com.swimpay.receiver.outbox.EncryptedOutboxStore {
    private var record: OutboxRecord = initialRecord

    override fun enqueue(record: OutboxRecord): OutboxRecord = record

    override fun markUploading(eventId: String): OutboxRecord? {
        record = record.copy(status = OutboxStatus.UPLOADING)
        return record
    }

    override fun markAcked(eventId: String, ackReceivedAt: String): OutboxRecord? {
        record = record.copy(status = OutboxStatus.ACKED, ackReceivedAt = ackReceivedAt, nextRetryAt = null)
        return record
    }

    override fun markFailedRetrying(
        eventId: String,
        sanitizedError: String,
        nextRetryAt: String,
        lastAttemptAt: String
    ): OutboxRecord? {
        record = record.copy(
            status = OutboxStatus.FAILED_RETRYING,
            attemptCount = record.attemptCount + 1,
            nextRetryAt = nextRetryAt,
            lastAttemptAt = lastAttemptAt
        )
        return record
    }

    override fun dueRecords(nowIso: String): List<OutboxRecord> {
        val retryAt = record.nextRetryAt
        return when {
            record.status == OutboxStatus.PENDING_UPLOAD -> listOf(record)
            record.status == OutboxStatus.FAILED_RETRYING && retryAt != null && retryAt <= nowIso -> {
                listOf(record)
            }
            else -> emptyList()
        }
    }
}
