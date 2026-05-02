package com.swimpay.receiver.outbox

class AndroidEncryptedOutboxStore(
    private val storage: EncryptedStorageAdapter
) : EncryptedOutboxStore {
    override fun enqueue(record: OutboxRecord): OutboxRecord {
        require(!record.encryptedPayload.contains("+7")) { "raw phone must not be stored" }
        require(!record.encryptedPayload.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }

        val existing = storage.read(record.eventId)
        if (existing != null) {
            return existing
        }
        storage.write(record.eventId, record)
        return record
    }

    override fun markUploading(eventId: String): OutboxRecord? {
        return transition(eventId, OutboxStatus.UPLOADING)
    }

    override fun markAcked(eventId: String): OutboxRecord? {
        return transition(eventId, OutboxStatus.ACKED)
    }

    override fun markFailedRetrying(eventId: String, sanitizedError: String): OutboxRecord? {
        require(!sanitizedError.contains("+7")) { "raw phone must not be stored" }
        return transition(eventId, OutboxStatus.FAILED_RETRYING)
    }

    override fun dueRecords(nowIso: String): List<OutboxRecord> {
        return storage.readAll().filter { record ->
            record.status == OutboxStatus.PENDING_UPLOAD ||
                (record.status == OutboxStatus.FAILED_RETRYING && (record.nextRetryAt == null || record.nextRetryAt <= nowIso))
        }
    }

    private fun transition(eventId: String, status: OutboxStatus): OutboxRecord? {
        val existing = storage.read(eventId) ?: return null
        val updated = existing.copy(status = status)
        storage.write(eventId, updated)
        return updated
    }
}

interface EncryptedStorageAdapter {
    fun read(eventId: String): OutboxRecord?
    fun readAll(): List<OutboxRecord>
    fun write(eventId: String, record: OutboxRecord)
}
