package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BankProfileSelectionTest {
    @Test
    fun noSelectedBankIsNotReadyForDetection() {
        val model = ReceiverBankProfileSelectionModel(
            profiles = listOf(ReceiverBankProfileSelectionDefaults.sberToVerify(selected = false))
        )

        assertTrue(model.selectedProfiles().isEmpty())
        assertFalse(model.hasSelectedBank())
        assertEquals(0, model.selectedReviewOnlyProfiles().size)
    }

    @Test
    fun selectedToVerifyBankIsReviewOnlyAndNeverTrusted() {
        val selection = ReceiverBankProfileSelectionDefaults.sberToVerify(selected = true)

        assertTrue(selection.selected)
        assertTrue(selection.reviewOnly)
        assertFalse(selection.isTrustedForProductionReady())
        assertTrue(selection.isReviewOnlyDetectionCandidate())
        assertEquals(BankPackageVerificationStatus.TO_VERIFY, selection.verificationStatus)
        assertEquals("TO_VERIFY", selection.packageName)
        assertEquals("TO_VERIFY", selection.packageCertSha256)
    }

    @Test
    fun selectedSyntheticDebugBankIsDebugOnlyAndNotProductionTrust() {
        val selection = ReceiverBankProfileSelectionDefaults.syntheticDebug(selected = true)

        assertTrue(selection.syntheticDebugOnly)
        assertTrue(selection.selected)
        assertFalse(selection.isTrustedForProductionReady())
        assertTrue(selection.toOnboardingProfile().reviewOnly)
        assertTrue(selection.bankProfileId.contains("synthetic_debug_only"))
    }

    @Test
    fun unknownBankSelectionIsIgnored() {
        val model = ReceiverBankProfileSelectionModel(
            profiles = listOf(ReceiverBankProfileSelectionDefaults.sberToVerify(selected = false))
        )

        val updated = model.select("unknown_bank")

        assertTrue(updated.selectedProfiles().isEmpty())
        assertFalse(updated.hasSelectedBank())
    }

    @Test
    fun verifiedProfileStillRequiresConcreteNonSyntheticTrustEvidence() {
        val syntheticVerified = ReceiverBankProfileSelection(
            bankProfileId = "synthetic_debug_only_verified",
            displayName = "Synthetic Debug Bank",
            packageName = "com.swimpay.syntheticbank.debug",
            packageCertSha256 = "synthetic_debug_only_cert",
            verificationStatus = BankPackageVerificationStatus.VERIFIED,
            selected = true,
            reviewOnly = false,
            syntheticDebugOnly = true
        )

        assertFalse(syntheticVerified.isTrustedForProductionReady())
    }

    @Test
    fun ozonRuntimeVerifiedProfileRemainsReviewOnlyUntilCertificateIsDocumented() {
        val ozon = ReceiverBankProfileSelectionDefaults.v1ReviewOnlyProfiles()
            .first { it.bankProfileId == "ozon_bank" }
            .copy(selected = true)

        assertEquals("Ozon Банк", ozon.displayName)
        assertEquals("ru.ozon.fintech.finance", ozon.packageName)
        assertEquals("documented_unknown", ozon.packageCertSha256)
        assertEquals(BankPackageVerificationStatus.VERIFIED, ozon.verificationStatus)
        assertTrue(ozon.reviewOnly)
        assertFalse(ozon.isTrustedForProductionReady())
        assertTrue(ozon.toOnboardingProfile().reviewOnly)
    }
}
