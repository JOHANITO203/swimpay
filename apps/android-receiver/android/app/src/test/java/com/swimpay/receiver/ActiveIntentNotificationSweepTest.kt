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
                expectedPaymentProfilePresent = true,
                receivingRouteLocked = true
            ),
            source = ActiveNotificationSweepSource.ACTIVE_NOTIFICATIONS,
            snapshots = listOf(StagingSyntheticNotificationHarness.supportedBankSnapshot(packageName = "ru.sberbankmobile"))
        )

        assertTrue(result.skipped)
        assertEquals("active_payment_intent_required", result.reason)
        assertEquals(0, result.acceptedCount)
    }

    @Test
    fun skipsSweepWhenReceivingRouteIsNotLocked() {
        val sweep = ActiveIntentNotificationSweep(
            debugEnabled = false,
            enabledBankPackages = setOf("ru.sberbankmobile")
        )

        val result = sweep.processSnapshots(
            window = ActiveIntentWindow(
                paymentIntentActive = true,
                receiverArmed = true,
                expectedPaymentProfilePresent = true,
                receivingRouteLocked = false
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
                expectedPaymentProfilePresent = true,
                receivingRouteLocked = true
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
                expectedPaymentProfilePresent = true,
                receivingRouteLocked = true
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

    @Test
    fun exposesAcceptedSweepResultsForSignedOutboxUpload() {
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
                expectedPaymentProfilePresent = true,
                receivingRouteLocked = true
            ),
            source = ActiveNotificationSweepSource.ACTIVE_NOTIFICATIONS,
            snapshots = listOf(supported)
        )

        val uploadable = result.uploadableResults.single()
        assertTrue(uploadable.accepted)
        val payload = uploadable.payload ?: error("payload required")
        assertEquals("ru.sberbankmobile", payload["package_name"])
        assertEquals(false, payload["raw_text_present"])
        assertFalse(payload.toString().contains("+79991234567"))
        assertFalse(payload.toString().contains("SWP-ABC123"))
    }

    @Test
    fun redactedRecentBufferPurgesExpiredEntriesAndDeduplicatesByHash() {
        var now = java.time.Instant.parse("2026-05-12T10:02:00.000Z").toEpochMilli()
        val buffer = RedactedRecentNotificationBuffer(
            maxRecords = 8,
            maxAgeMs = 60_000,
            nowEpochMs = { now }
        )

        val old = redactedObservation(
            observedAt = "2026-05-12T10:00:00.000Z",
            notificationHash = "old_hash"
        )
        val first = redactedObservation(
            observedAt = "2026-05-12T10:01:30.000Z",
            notificationHash = "dup_hash",
            categoryGuess = "incoming_transfer"
        )
        val replacement = redactedObservation(
            observedAt = "2026-05-12T10:01:45.000Z",
            notificationHash = "dup_hash",
            categoryGuess = "incoming_sbp"
        )

        buffer.add(old)
        buffer.add(first)
        buffer.add(replacement)

        val observations = buffer.list()
        assertEquals(1, observations.size)
        assertEquals("dup_hash", observations.single().notificationHash)
        assertEquals("incoming_sbp", observations.single().categoryGuess)

        now = java.time.Instant.parse("2026-05-12T10:04:00.000Z").toEpochMilli()
        assertTrue(buffer.list().isEmpty())
    }

    @Test(expected = IllegalArgumentException::class)
    fun redactedRecentBufferRejectsRawPhoneOrCardLikeValues() {
        RedactedRecentNotificationBuffer().add(
            redactedObservation(categoryGuess = "incoming from +79991234567")
        )
    }

    private fun redactedObservation(
        observedAt: String = "2026-05-12T10:01:00.000Z",
        notificationHash: String = "notification_hash",
        categoryGuess: String = "incoming_transfer"
    ): RedactedRecentObservation {
        return RedactedRecentObservation(
            packageName = "ru.sberbankmobile",
            bankId = "sber_ru",
            observedAt = observedAt,
            notificationHash = notificationHash,
            semanticHash = "semantic_hash",
            categoryGuess = categoryGuess,
            amountMinor = 13700L,
            rawTextPresent = false
        )
    }
}
