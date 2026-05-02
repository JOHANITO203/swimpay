package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BankPackageEvidenceTest {
    @Test
    fun toVerifyEvidenceRemainsReviewOnlyAndUntrusted() {
        val evidence = BankPackageEvidenceObservation(
            bankProfileId = "sber_ru",
            packageName = "TO_VERIFY",
            packageCertSha256 = "TO_VERIFY",
            source = BankPackageEvidenceSource.PACKAGE_MANAGER_DRY_RUN,
            capturedAt = "2026-05-03T01:40:00.000Z",
            displayLabel = "Operator placeholder"
        )

        val assessment = BankPackageEvidencePolicy().assess(evidence)

        assertEquals(BankPackageEvidenceDecision.REVIEW_ONLY, assessment.decision)
        assertEquals(BankPackageVerificationStatus.TO_VERIFY, assessment.selection.verificationStatus)
        assertTrue(assessment.selection.reviewOnly)
        assertFalse(assessment.selection.isTrustedForProductionReady())
        assertTrue(assessment.reasonCodes.contains("package_cert_to_verify"))
    }

    @Test
    fun concretePackageManagerEvidenceRequiresOperatorReviewAndDoesNotTrustAutomatically() {
        val evidence = BankPackageEvidenceObservation(
            bankProfileId = "sber_ru",
            packageName = "operator.candidate.package",
            packageCertSha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            source = BankPackageEvidenceSource.PACKAGE_MANAGER_DRY_RUN,
            capturedAt = "2026-05-03T01:40:00.000Z",
            displayLabel = "Operator selected package"
        )

        val assessment = BankPackageEvidencePolicy().assess(evidence)

        assertEquals(BankPackageEvidenceDecision.OPERATOR_REVIEW_REQUIRED, assessment.decision)
        assertEquals(BankPackageVerificationStatus.PENDING_VERIFICATION, assessment.selection.verificationStatus)
        assertTrue(assessment.selection.reviewOnly)
        assertFalse(assessment.selection.syntheticDebugOnly)
        assertFalse(assessment.selection.isTrustedForProductionReady())
        assertTrue(assessment.reasonCodes.contains("operator_review_required"))
    }

    @Test
    fun syntheticDebugEvidenceCannotBecomeProductionTrust() {
        val evidence = BankPackageEvidenceObservation(
            bankProfileId = "sber_ru",
            packageName = "synthetic_debug_only.com.swimpay.syntheticbank",
            packageCertSha256 = "synthetic_debug_only.cert_sha256",
            source = BankPackageEvidenceSource.SYNTHETIC_DEBUG_ONLY,
            capturedAt = "2026-05-03T01:40:00.000Z",
            displayLabel = "Synthetic debug source"
        )

        val assessment = BankPackageEvidencePolicy().assess(evidence)

        assertEquals(BankPackageEvidenceDecision.REVIEW_ONLY, assessment.decision)
        assertTrue(assessment.selection.syntheticDebugOnly)
        assertTrue(assessment.selection.reviewOnly)
        assertFalse(assessment.selection.isTrustedForProductionReady())
        assertTrue(assessment.reasonCodes.contains("synthetic_debug_only"))
    }

    @Test
    fun diagnosticsMaskCertificateAndRedactSensitiveText() {
        val evidence = BankPackageEvidenceObservation(
            bankProfileId = "sber_ru",
            packageName = "operator.candidate.package",
            packageCertSha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            source = BankPackageEvidenceSource.PACKAGE_MANAGER_DRY_RUN,
            capturedAt = "2026-05-03T01:40:00.000Z",
            displayLabel = "secret token +79991234567 raw_notification signature"
        )

        val diagnostics = BankPackageEvidenceDiagnosticsExporter().export(
            BankPackageEvidencePolicy().assess(evidence)
        )

        assertEquals("012345...abcdef", diagnostics.certSha256Masked)
        assertFalse(diagnostics.toString().contains(evidence.packageCertSha256))
        assertFalse(diagnostics.toString().contains("+79991234567"))
        assertFalse(diagnostics.toString().contains("raw_notification", ignoreCase = true))
        assertFalse(diagnostics.toString().contains("signature", ignoreCase = true))
        assertFalse(diagnostics.toString().contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(diagnostics.toString().contains("bank_confirmed", ignoreCase = true))
    }
}
