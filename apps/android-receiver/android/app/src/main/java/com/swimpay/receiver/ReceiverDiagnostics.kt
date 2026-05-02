package com.swimpay.receiver

import com.swimpay.receiver.outbox.EncryptedOutboxStore
import com.swimpay.receiver.outbox.OutboxStatus

data class ReceiverDiagnosticsSnapshot(
    val appVersion: String,
    val deviceStatus: String,
    val notificationAccessEnabled: Boolean,
    val appNotificationsPermissionEnabled: Boolean,
    val listenerConnected: Boolean,
    val allowedBanksCount: Int,
    val selectedBankCount: Int,
    val selectedBankVerificationStatuses: List<String>,
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
        appNotificationsPermissionEnabled: Boolean,
        listenerConnected: Boolean,
        allowedBanksCount: Int,
        syntheticDebugSourceEnabled: Boolean,
        backendReachable: Boolean,
        lastSignalObservedAt: String?,
        lastUploadStatus: String?,
        lastSafeErrorSummary: String?,
        outboxStore: EncryptedOutboxStore,
        appVersion: String = "0.1.0-debug",
        deviceStatus: String = "unknown",
        selectedBankVerificationStatuses: List<String> = emptyList()
    ): ReceiverDiagnosticsSnapshot {
        val records = outboxStore.dueRecords("9999-12-31T23:59:59.999Z")
        return ReceiverDiagnosticsSnapshot(
            appVersion = redactDebugMessage(appVersion),
            deviceStatus = redactDebugMessage(deviceStatus),
            notificationAccessEnabled = notificationAccessEnabled,
            appNotificationsPermissionEnabled = appNotificationsPermissionEnabled,
            listenerConnected = listenerConnected,
            allowedBanksCount = allowedBanksCount,
            selectedBankCount = selectedBankVerificationStatuses.size,
            selectedBankVerificationStatuses = selectedBankVerificationStatuses.map { redactDebugMessage(it) },
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

data class ReceiverOperatorDiagnosticsExport(
    val appVersion: String,
    val deviceStatus: String,
    val notificationAccessEnabled: Boolean,
    val appNotificationsPermissionEnabled: Boolean,
    val listenerConnected: Boolean,
    val backendReachable: Boolean,
    val selectedBankCount: Int,
    val selectedBankVerificationStatuses: List<String>,
    val outboxPendingCount: Int,
    val outboxFailedRetryingCount: Int,
    val lastUploadStatus: String,
    val lastSignalObservedAt: String,
    val lastSafeErrorSummary: String,
    val syntheticDebugSourceEnabled: Boolean
)

class ReceiverOperatorDiagnosticsExporter {
    fun export(snapshot: ReceiverDiagnosticsSnapshot): ReceiverOperatorDiagnosticsExport {
        return ReceiverOperatorDiagnosticsExport(
            appVersion = redactDebugMessage(snapshot.appVersion),
            deviceStatus = redactDebugMessage(snapshot.deviceStatus),
            notificationAccessEnabled = snapshot.notificationAccessEnabled,
            appNotificationsPermissionEnabled = snapshot.appNotificationsPermissionEnabled,
            listenerConnected = snapshot.listenerConnected,
            backendReachable = snapshot.backendReachable,
            selectedBankCount = snapshot.selectedBankCount,
            selectedBankVerificationStatuses = snapshot.selectedBankVerificationStatuses.map { redactDebugMessage(it) },
            outboxPendingCount = snapshot.outboxPendingCount,
            outboxFailedRetryingCount = snapshot.outboxFailedRetryingCount,
            lastUploadStatus = redactDebugMessage(snapshot.lastUploadStatus),
            lastSignalObservedAt = redactDebugMessage(snapshot.lastSignalObservedAt),
            lastSafeErrorSummary = redactDebugMessage(snapshot.lastSafeErrorSummary),
            syntheticDebugSourceEnabled = snapshot.syntheticDebugSourceEnabled
        )
    }
}
