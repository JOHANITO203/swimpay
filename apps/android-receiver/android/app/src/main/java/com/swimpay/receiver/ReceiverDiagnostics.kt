package com.swimpay.receiver

import com.swimpay.receiver.outbox.EncryptedOutboxStore
import com.swimpay.receiver.outbox.OutboxStatus

data class ReceiverDiagnosticsSnapshot(
    val notificationAccessEnabled: Boolean,
    val listenerConnected: Boolean,
    val allowedBanksCount: Int,
    val syntheticDebugSourceEnabled: Boolean,
    val outboxPendingCount: Int,
    val outboxFailedRetryingCount: Int,
    val lastUploadStatus: String,
    val backendReachable: Boolean,
    val lastSignalObservedAt: String,
    val lastSafeErrorSummary: String
)

class ReceiverDiagnosticsBuilder {
    fun build(
        notificationAccessEnabled: Boolean,
        listenerConnected: Boolean,
        allowedBanksCount: Int,
        syntheticDebugSourceEnabled: Boolean,
        backendReachable: Boolean,
        lastSignalObservedAt: String?,
        lastUploadStatus: String?,
        lastSafeErrorSummary: String?,
        outboxStore: EncryptedOutboxStore
    ): ReceiverDiagnosticsSnapshot {
        val records = outboxStore.dueRecords("9999-12-31T23:59:59.999Z")
        return ReceiverDiagnosticsSnapshot(
            notificationAccessEnabled = notificationAccessEnabled,
            listenerConnected = listenerConnected,
            allowedBanksCount = allowedBanksCount,
            syntheticDebugSourceEnabled = syntheticDebugSourceEnabled,
            outboxPendingCount = records.count { it.status == OutboxStatus.PENDING_UPLOAD },
            outboxFailedRetryingCount = records.count { it.status == OutboxStatus.FAILED_RETRYING },
            lastUploadStatus = redactDebugMessage(lastUploadStatus ?: "no upload yet"),
            backendReachable = backendReachable,
            lastSignalObservedAt = lastSignalObservedAt ?: "never",
            lastSafeErrorSummary = redactDebugMessage(lastSafeErrorSummary ?: "none")
        )
    }
}
