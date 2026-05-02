package com.swimpay.receiver.outbox

enum class OutboxStatus(val wireValue: String) {
    CAPTURED("captured"),
    PENDING_UPLOAD("pending_upload"),
    UPLOADING("uploading"),
    ACKED("acked"),
    FAILED_RETRYING("failed_retrying"),
    EXPIRED("expired")
}

data class OutboxRecord(
    val localId: String,
    val eventId: String,
    val notificationHash: String,
    val semanticHash: String?,
    val payloadHash: String,
    val encryptedPayload: String,
    val status: OutboxStatus,
    val attemptCount: Int,
    val firstSeenAt: String,
    val lastAttemptAt: String?,
    val nextRetryAt: String?,
    val ackReceivedAt: String?
)

interface EncryptedOutboxStore {
    fun enqueue(record: OutboxRecord): OutboxRecord
    fun markUploading(eventId: String): OutboxRecord?
    fun markAcked(eventId: String, ackReceivedAt: String): OutboxRecord?
    fun markFailedRetrying(
        eventId: String,
        sanitizedError: String,
        nextRetryAt: String,
        lastAttemptAt: String
    ): OutboxRecord?
    fun dueRecords(nowIso: String): List<OutboxRecord>
}
