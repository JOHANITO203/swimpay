package com.swimpay.receiver.work

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RetryPolicyTest {
    @Test
    fun retryDelaysAreBoundedAndDeterministic() {
        val policy = ReceiverRetryPolicy()

        assertEquals(0L, policy.delayMsForAttempt(1))
        assertEquals(30_000L, policy.delayMsForAttempt(2))
        assertEquals(120_000L, policy.delayMsForAttempt(3))
        assertEquals(300_000L, policy.delayMsForAttempt(4))
        assertEquals(900_000L, policy.delayMsForAttempt(5))
        assertEquals(900_000L, policy.delayMsForAttempt(99))
    }

    @Test
    fun onlyBoundedAttemptsAreRetryable() {
        val policy = ReceiverRetryPolicy(maxAttempts = 6)

        assertTrue(policy.shouldRetry(5))
        assertEquals(false, policy.shouldRetry(6))
    }
}

