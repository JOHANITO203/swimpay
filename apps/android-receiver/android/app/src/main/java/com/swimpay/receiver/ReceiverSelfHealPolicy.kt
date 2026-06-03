package com.swimpay.receiver

import java.time.Instant

/**
 * Pure decision for the receiver self-heal loop (foreground service) and the
 * periodic heartbeat guardrail. Intentionally has no Android dependency so the
 * "when do we rebind / when do we alert the merchant" policy is unit-testable
 * without a device.
 */
data class ReceiverSelfHealInput(
    val notificationAccessEnabled: Boolean,
    val listenerConnected: Boolean,
    val lastDisconnectedAtIso: String?,
    val nowIso: String,
    val offlineAlertThresholdMs: Long = DEFAULT_OFFLINE_ALERT_THRESHOLD_MS
) {
    companion object {
        const val DEFAULT_OFFLINE_ALERT_THRESHOLD_MS: Long = 5 * 60 * 1000
    }
}

data class ReceiverSelfHealDecision(
    val shouldRequestRebind: Boolean,
    val offlineDurationMs: Long?,
    val shouldAlertMerchantOffline: Boolean,
    val reason: String
)

object ReceiverSelfHealPolicy {
    fun decide(input: ReceiverSelfHealInput): ReceiverSelfHealDecision {
        // Access revoked by the user: the system will not let us rebind until it
        // is re-granted, so a rebind request is pointless, but the merchant must
        // be told promptly that capture is down.
        if (!input.notificationAccessEnabled) {
            return ReceiverSelfHealDecision(
                shouldRequestRebind = false,
                offlineDurationMs = null,
                shouldAlertMerchantOffline = true,
                reason = "notification_access_revoked"
            )
        }
        // Access granted and the listener is bound: healthy, nothing to do.
        if (input.listenerConnected) {
            return ReceiverSelfHealDecision(
                shouldRequestRebind = false,
                offlineDurationMs = null,
                shouldAlertMerchantOffline = false,
                reason = "healthy"
            )
        }
        // Access granted but the OEM unbound the listener: request a rebind, and
        // escalate to a merchant alert only once it has been down past threshold.
        val offlineMs = offlineDurationMs(input.lastDisconnectedAtIso, input.nowIso)
        val overThreshold = offlineMs != null && offlineMs >= input.offlineAlertThresholdMs
        return ReceiverSelfHealDecision(
            shouldRequestRebind = true,
            offlineDurationMs = offlineMs,
            shouldAlertMerchantOffline = overThreshold,
            reason = if (overThreshold) "listener_disconnected_over_threshold" else "listener_disconnected_rebinding"
        )
    }

    private fun offlineDurationMs(lastDisconnectedAtIso: String?, nowIso: String): Long? {
        if (lastDisconnectedAtIso.isNullOrBlank()) return null
        val disconnectedAt = runCatching { Instant.parse(lastDisconnectedAtIso).toEpochMilli() }.getOrNull() ?: return null
        val now = runCatching { Instant.parse(nowIso).toEpochMilli() }.getOrNull() ?: return null
        return (now - disconnectedAt).coerceAtLeast(0)
    }
}
