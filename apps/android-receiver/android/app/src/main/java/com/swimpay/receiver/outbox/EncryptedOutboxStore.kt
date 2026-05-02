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
    val eventId: String,
    val notificationHash: String,
    val encryptedPayload: String,
    val status: OutboxStatus,
    val attemptCount: Int,
    val firstSeenAt: String,
    val nextRetryAt: String?
)

interface EncryptedOutboxStore {
    fun enqueue(record: OutboxRecord): OutboxRecord
    fun markUploading(eventId: String): OutboxRecord?
    fun markAcked(eventId: String): OutboxRecord?
    fun markFailedRetrying(eventId: String, sanitizedError: String): OutboxRecord?
    fun dueRecords(nowIso: String): List<OutboxRecord>
}
