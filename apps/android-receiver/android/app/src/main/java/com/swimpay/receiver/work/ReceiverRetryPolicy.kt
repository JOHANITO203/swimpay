package com.swimpay.receiver.work

class ReceiverRetryPolicy(
    private val maxAttempts: Int = 6
) {
    fun delayMsForAttempt(attempt: Int): Long {
        return when (attempt.coerceAtLeast(1)) {
            1 -> 0L
            2 -> 30_000L
            3 -> 120_000L
            4 -> 300_000L
            else -> 900_000L
        }
    }

    fun shouldRetry(attemptCount: Int): Boolean = attemptCount < maxAttempts
}

