package com.swimpay.receiver

data class BackendStatusSnapshot(
    val reachable: Boolean,
    val checkedAt: String,
    val safeMessage: String
)

class BackendStatusRefresher(
    private val httpClient: DebugReceiverHttpClient,
    private val nowIso: () -> String = { java.time.Instant.now().toString() }
) {
    fun refresh(): BackendStatusSnapshot {
        val result = httpClient.health()
        return BackendStatusSnapshot(
            reachable = result.success,
            checkedAt = nowIso(),
            safeMessage = redactDebugMessage(result.safeMessage)
        )
    }
}

