package com.swimpay.receiver

enum class ReceiverRuntimeState {
    IDLE,
    ARMED,
    LISTENING,
    DEGRADED,
    OFFLINE,
    MANUAL_CHECK_REQUIRED
}

data class ReceiverStatusState(
    val notificationAccessEnabled: Boolean,
    val listenerConnected: Boolean,
    val allowedBanksCount: Int,
    val trustedBanksCount: Int,
    val queueLength: Int,
    val backendReachable: Boolean,
    val runtimeState: ReceiverRuntimeState,
    val warnings: List<String>
)

class ReceiverStatusViewModel {
    fun buildState(
        notificationAccessEnabled: Boolean,
        listenerConnected: Boolean,
        allowedBanksCount: Int,
        trustedBanksCount: Int,
        queueLength: Int,
        backendReachable: Boolean
    ): ReceiverStatusState {
        val warnings = buildList {
            if (!notificationAccessEnabled) add("notification_access_disabled")
            if (!listenerConnected) add("listener_disconnected")
            if (allowedBanksCount == 0) add("no_banks_allowed")
            if (allowedBanksCount > 0 && trustedBanksCount == 0) add("all_banks_untrusted")
            if (queueLength >= 50) add("queue_backlog_high")
            if (!backendReachable) add("backend_unreachable")
        }

        return ReceiverStatusState(
            notificationAccessEnabled = notificationAccessEnabled,
            listenerConnected = listenerConnected,
            allowedBanksCount = allowedBanksCount,
            trustedBanksCount = trustedBanksCount,
            queueLength = queueLength,
            backendReachable = backendReachable,
            runtimeState = deriveRuntimeState(
                notificationAccessEnabled = notificationAccessEnabled,
                listenerConnected = listenerConnected,
                allowedBanksCount = allowedBanksCount,
                trustedBanksCount = trustedBanksCount,
                queueLength = queueLength,
                backendReachable = backendReachable
            ),
            warnings = warnings
        )
    }

    private fun deriveRuntimeState(
        notificationAccessEnabled: Boolean,
        listenerConnected: Boolean,
        allowedBanksCount: Int,
        trustedBanksCount: Int,
        queueLength: Int,
        backendReachable: Boolean
    ): ReceiverRuntimeState {
        if (!backendReachable) return ReceiverRuntimeState.OFFLINE
        if (!notificationAccessEnabled || !listenerConnected || allowedBanksCount == 0) return ReceiverRuntimeState.DEGRADED
        if (allowedBanksCount > 0 && trustedBanksCount == 0) return ReceiverRuntimeState.DEGRADED
        if (queueLength >= 50) return ReceiverRuntimeState.MANUAL_CHECK_REQUIRED
        return ReceiverRuntimeState.LISTENING
    }
}
