package com.swimpay.receiver.outbox

import android.content.Context
import java.util.Base64

class AndroidEncryptedOutboxStore(
    private val storage: EncryptedStorageAdapter
) : EncryptedOutboxStore {
    override fun enqueue(record: OutboxRecord): OutboxRecord {
        validateSafe(record.encryptedPayload)
        require(!record.encryptedPayload.contains("+7")) { "raw phone must not be stored" }
        require(!record.encryptedPayload.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }

        val existing = storage.read(record.eventId)
        if (existing != null) {
            return existing
        }
        val sameHash = storage.readAll().firstOrNull { it.notificationHash == record.notificationHash }
        if (sameHash != null) {
            return sameHash
        }
        storage.write(record.eventId, record)
        return record
    }

    override fun markUploading(eventId: String): OutboxRecord? {
        return transition(eventId, OutboxStatus.UPLOADING)
    }

    override fun markAcked(eventId: String, ackReceivedAt: String): OutboxRecord? {
        val existing = storage.read(eventId) ?: return null
        val updated = existing.copy(status = OutboxStatus.ACKED, ackReceivedAt = ackReceivedAt, nextRetryAt = null)
        storage.write(eventId, updated)
        return updated
    }

    override fun markFailedRetrying(
        eventId: String,
        sanitizedError: String,
        nextRetryAt: String,
        lastAttemptAt: String
    ): OutboxRecord? {
        require(!sanitizedError.contains("+7")) { "raw phone must not be stored" }
        require(!sanitizedError.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }
        val existing = storage.read(eventId) ?: return null
        val updated = existing.copy(
            status = OutboxStatus.FAILED_RETRYING,
            attemptCount = existing.attemptCount + 1,
            lastAttemptAt = lastAttemptAt,
            nextRetryAt = nextRetryAt
        )
        storage.write(eventId, updated)
        return updated
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

    private fun validateSafe(value: String) {
        require(!value.contains(Regex("\\+\\d[\\d\\s()-]{6,}"))) {
            "raw phone must not be stored"
        }
        require(!value.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }
    }
}

interface EncryptedStorageAdapter {
    fun read(eventId: String): OutboxRecord?
    fun readAll(): List<OutboxRecord>
    fun write(eventId: String, record: OutboxRecord)
}

class SharedPreferencesOutboxStorageAdapter(context: Context) : EncryptedStorageAdapter {
    private val preferences = context.getSharedPreferences("swimpay_receiver_outbox", Context.MODE_PRIVATE)

    override fun read(eventId: String): OutboxRecord? {
        return preferences.getString(key(eventId), null)?.let(::decode)
    }

    override fun readAll(): List<OutboxRecord> {
        return preferences.all.values.mapNotNull { value ->
            (value as? String)?.let(::decode)
        }
    }

    override fun write(eventId: String, record: OutboxRecord) {
        preferences.edit().putString(key(eventId), encode(record)).apply()
    }

    private fun key(eventId: String): String = "outbox_$eventId"

    private fun encode(record: OutboxRecord): String {
        return listOf(
            record.localId,
            record.eventId,
            record.notificationHash,
            record.semanticHash.orEmpty(),
            record.payloadHash,
            record.encryptedPayload,
            record.status.wireValue,
            record.attemptCount.toString(),
            record.firstSeenAt,
            record.lastAttemptAt.orEmpty(),
            record.nextRetryAt.orEmpty(),
            record.ackReceivedAt.orEmpty()
        ).joinToString("|") { Base64.getUrlEncoder().withoutPadding().encodeToString(it.toByteArray(Charsets.UTF_8)) }
    }

    private fun decode(value: String): OutboxRecord? {
        val parts = value.split("|").map { part ->
            String(Base64.getUrlDecoder().decode(part), Charsets.UTF_8)
        }
        if (parts.size != 12) {
            return null
        }
        val status = OutboxStatus.values().firstOrNull { it.wireValue == parts[6] } ?: return null
        return OutboxRecord(
            localId = parts[0],
            eventId = parts[1],
            notificationHash = parts[2],
            semanticHash = parts[3].ifBlank { null },
            payloadHash = parts[4],
            encryptedPayload = parts[5],
            status = status,
            attemptCount = parts[7].toIntOrNull() ?: 0,
            firstSeenAt = parts[8],
            lastAttemptAt = parts[9].ifBlank { null },
            nextRetryAt = parts[10].ifBlank { null },
            ackReceivedAt = parts[11].ifBlank { null }
        )
    }
}
