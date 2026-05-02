package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverNotificationPipelineTest {
    @Test
    fun acceptsSyntheticDebugPackageOnlyInDebugMode() {
        val debugGate = SyntheticPackageGate(debugEnabled = true)
        val releaseGate = SyntheticPackageGate(debugEnabled = false)
        val synthetic = SyntheticNotificationFixtures.incomingTransferSnapshot()

        assertTrue(debugGate.evaluate(synthetic).accepted)
        assertFalse(releaseGate.evaluate(synthetic).accepted)
        assertEquals("synthetic_debug_only", debugGate.evaluate(synthetic).packageTrustLabel)
        assertEquals("synthetic_debug_package_disabled", releaseGate.evaluate(synthetic).reason)
    }

    @Test
    fun ignoresUnknownAndToVerifyPackages() {
        val gate = SyntheticPackageGate(debugEnabled = true)
        val unknown = SyntheticNotificationFixtures.incomingTransferSnapshot().copy(
            packageName = "com.example.unknown",
            syntheticDebugOnly = false,
            verificationStatus = BankPackageVerificationStatus.VERIFIED
        )
        val toVerify = SyntheticNotificationFixtures.incomingTransferSnapshot().copy(
            packageName = "TO_VERIFY",
            syntheticDebugOnly = false,
            verificationStatus = BankPackageVerificationStatus.TO_VERIFY
        )

        assertFalse(gate.evaluate(unknown).accepted)
        assertEquals("package_not_allowed", gate.evaluate(unknown).reason)
        assertFalse(gate.evaluate(toVerify).accepted)
        assertEquals("package_cert_unverified", gate.evaluate(toVerify).reason)
    }

    @Test
    fun coalescesDuplicateSnapshotsAndBuildsStableHashes() {
        val first = SyntheticNotificationFixtures.incomingTransferSnapshot(postTime = 1000L)
        val duplicate = first.copy(postTime = 1000L)
        val later = first.copy(postTime = 1500L, notificationId = 138)

        val coalesced = NotificationCoalescer().coalesce(listOf(first, duplicate, later))

        assertEquals(2, coalesced.snapshotCount)
        assertEquals(1000L, coalesced.firstSnapshotAt)
        assertEquals(1500L, coalesced.lastSnapshotAt)
        assertTrue(coalesced.notificationHash.startsWith("synthetic_debug_only:"))
        assertTrue(coalesced.semanticHash.startsWith("semantic:"))
    }

    @Test
    fun privacyFirewallRedactsBeforePayloadCreation() {
        val processor = ReceiverNotificationPipeline(debugEnabled = true)
        val result = processor.process(
            listOf(
                SyntheticNotificationFixtures.incomingTransferSnapshot(
                    title = "Поступление 137 ₽",
                    text = "Перевод от Ivan +79991234567. Коммент SWP-ABC123"
                )
            )
        )

        assertTrue(result.accepted)
        assertEquals("enqueued", result.nextAction)
        assertEquals("synthetic_debug_only", result.packageTrustLabel)
        val payload = result.payload ?: error("payload expected")

        assertEquals("synthetic_debug_only.com.swimpay.syntheticbank", payload["package_name"])
        assertEquals("synthetic_debug_only.cert_sha256", payload["package_cert_sha256"])
        assertEquals(false, payload["raw_text_present"])
        assertEquals(13700L, payload["amount_minor"])
        assertEquals("RUB", payload["currency"])
        assertEquals("<PHONE>", payload["sender_phone_masked"])
        assertEquals("<REFERENCE>", payload["reference_code_masked"])
        assertTrue(payload["redacted_body"].toString().contains("<PHONE>"))
        assertTrue(payload["redacted_body"].toString().contains("<REFERENCE>"))
        assertFalse(payload.toString().contains("+79991234567"))
        assertFalse(payload.toString().contains("SWP-ABC123"))
        assertFalse(payload.toString().contains("official_bank_confirmation"))
        assertFalse(payload.toString().contains("bank_confirmed", ignoreCase = true))
    }

    @Test
    fun negativeSyntheticNotificationsDoNotBecomePaymentConfirmation() {
        val processor = ReceiverNotificationPipeline(debugEnabled = true)
        val categories = listOf("cashback", "refund", "outgoing", "promo", "failed")

        for (category in categories) {
            val result = processor.process(listOf(SyntheticNotificationFixtures.negativeSnapshot(category)))

            assertTrue(result.accepted)
            assertEquals("enqueued", result.nextAction)
            assertEquals(category, result.safeCategory)
            assertFalse(result.payload.toString().contains("auto_confirm", ignoreCase = true))
            assertFalse(result.payload.toString().contains("official_bank_confirmation"))
        }
    }
}
