package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ActiveIntentNotificationSweepTest {
    @Test
    fun skipsSweepWithoutActivePaymentIntentWindow() {
        val sweep = ActiveIntentNotificationSweep(
            debugEnabled = false,
            enabledBankPackages = setOf("ru.sberbankmobile")
        )

        val result = sweep.processSnapshots(
            window = ActiveIntentWindow(
                paymentIntentActive = false,
                receiverArmed = true,
                expectedPaymentProfilePresent = true
            ),
            source = ActiveNotificationSweepSource.ACTIVE_NOTIFICATIONS,
            snapshots = listOf(StagingSyntheticNotificationHarness.supportedBankSnapshot(packageName = "ru.sberbankmobile"))
        )

        assertTrue(result.skipped)
        assertEquals("active_payment_intent_required", result.reason)
        assertEquals(0, result.acceptedCount)
    }

    @Test
    fun filtersUnsupportedPackagesBeforeRedactedObservationCreation() {
        val sweep = ActiveIntentNotificationSweep(
            debugEnabled = false,
            enabledBankPackages = setOf("ru.sberbankmobile")
        )
        val unsupported = StagingSyntheticNotificationHarness.unsupportedPackageSnapshot()

        val result = sweep.processSnapshots(
            window = ActiveIntentWindow(
                paymentIntentActive = true,
                receiverArmed = true,
                expectedPaymentProfilePresent = true
            ),
            source = ActiveNotificationSweepSource.ACTIVE_NOTIFICATIONS,
            snapshots = listOf(unsupported)
        )

        assertFalse(result.skipped)
        assertEquals(0, result.acceptedCount)
        assertEquals(1, result.ignoredCount)
        assertTrue(result.observations.isEmpty())
        assertTrue(sweep.recentRedactedObservations().isEmpty())
    }

    @Test
    fun storesOnlyRedactedRecentObservationMetadataForActiveIntentSweep() {
        val sweep = ActiveIntentNotificationSweep(
            debugEnabled = false,
            enabledBankPackages = setOf("ru.sberbankmobile")
        )
        val supported = StagingSyntheticNotificationHarness.supportedBankSnapshot(
            packageName = "ru.sberbankmobile",
            title = "Incoming transfer 137 RUB",
            text = "Transfer from Ivan +79991234567. Ref SWP-ABC123",
            postTime = 1_775_000_100_000L
        )

        val result = sweep.processSnapshots(
            window = ActiveIntentWindow(
                paymentIntentActive = true,
                receiverArmed = true,
                expectedPaymentProfilePresent = true
            ),
            source = ActiveNotificationSweepSource.ACTIVE_NOTIFICATIONS,
            snapshots = listOf(supported)
        )

        assertFalse(result.skipped)
        assertEquals(1, result.acceptedCount)
        val observation = result.observations.single()
        assertEquals("ru.sberbankmobile", observation.packageName)
        assertEquals("sber_ru", observation.bankId)
        assertFalse(observation.rawTextPresent)
        assertTrue(observation.notificationHash.isNotBlank())
        assertTrue(observation.semanticHash.isNotBlank())
        assertFalse(observation.toString().contains("+79991234567"))
        assertFalse(observation.toString().contains("SWP-ABC123"))
        assertFalse(observation.toString().contains("manual_confirmed", ignoreCase = true))
        assertFalse(observation.toString().contains("payment.confirmed", ignoreCase = true))
    }
}
