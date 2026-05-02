package com.swimpay.receiver.work

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkManagerHardeningTest {
    @Test
    fun workPlanIsUniqueNetworkConstrainedAndBounded() {
        val plan = SignalUploadWorkPlan.next(delayMs = 30_000)

        assertEquals(SignalUploadWorker.UNIQUE_WORK_NAME, plan.uniqueName)
        assertEquals(30_000L, plan.initialDelayMs)
        assertTrue(plan.requiresNetwork)
        assertEquals(SignalUploadWorker.MAX_RETRY_ATTEMPTS, plan.maxAttempts)
    }

    @Test
    fun workerDecisionDoesNotRetryForever() {
        val policy = ReceiverRetryPolicy(maxAttempts = 6)

        assertTrue(SignalUploadWorkDecision.fromAttempts(5, policy).shouldRetry)
        assertFalse(SignalUploadWorkDecision.fromAttempts(6, policy).shouldRetry)
    }
}
