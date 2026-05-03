package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BankPackageEvidenceTest {
    @Test
    fun realBankPackageInputRequiresExplicitSinglePackageName() {
        val policy = RealBankPackageInputPolicy()

        assertEquals(
            PackageInputPolicyDecision.ACCEPT,
            policy.validate("operator.candidate.package").decision
        )
        assertEquals(
            PackageInputPolicyDecision.REJECT,
            policy.validate("").decision
        )
        assertEquals(
            PackageInputPolicyDecision.REJECT,
            policy.validate("operator.*").decision
        )
        assertEquals(
            PackageInputPolicyDecision.REJECT,
            policy.validate("TO_VERIFY").decision
        )
        assertEquals(
            PackageInputPolicyDecision.REJECT,
            policy.validate("synthetic_debug_only.com.swimpay.syntheticbank").decision
        )
        assertTrue(policy.validate("operator.*").reasonCodes.contains("installed_app_enumeration_forbidden"))
    }

    @Test
    fun explicitPackageLookupReturnsSafePackageNotFoundWithoutTrustEvidence() {
        val lookup = FakeExplicitPackageEvidenceLookup(
            observations = mapOf(
                "operator.candidate.package" to BankPackageEvidenceObservation(
                    bankProfileId = "sber_ru",
                    packageName = "operator.candidate.package",
                    packageCertSha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                    source = BankPackageEvidenceSource.PACKAGE_MANAGER_DRY_RUN,
                    capturedAt = "2026-05-03T12:00:00.000Z",
                    displayLabel = "Operator selected package"
                )
            )
        )

        val found = lookup.lookupExplicitPackageEvidence(
            bankProfileId = "sber_ru",
            packageName = "operator.candidate.package",
            capturedAt = "2026-05-03T12:00:00.000Z"
        )
        val missing = lookup.lookupExplicitPackageEvidence(
            bankProfileId = "sber_ru",
            packageName = "operator.missing.package",
            capturedAt = "2026-05-03T12:00:00.000Z"
        )

        assertEquals(BankPackageEvidenceLookupStatus.FOUND, found.status)
        assertEquals(BankPackageEvidenceLookupStatus.PACKAGE_NOT_FOUND, missing.status)
        assertTrue(found.observation?.hasConcretePackageAndCert() == true)
        assertEquals(null, missing.observation)
        assertFalse(missing.safeMessage.contains("+7"))
        assertFalse(missing.safeMessage.contains("raw_notification", ignoreCase = true))
        assertFalse(missing.safeMessage.contains("official_bank_confirmation", ignoreCase = true))
    }

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

private class FakeExplicitPackageEvidenceLookup(
    private val observations: Map<String, BankPackageEvidenceObservation>
) : ExplicitPackageEvidenceLookup {
    override fun lookupExplicitPackageEvidence(
        bankProfileId: String,
        packageName: String,
        capturedAt: String
    ): ExplicitPackageEvidenceLookupResult {
        val policy = RealBankPackageInputPolicy().validate(packageName)
        if (policy.decision != PackageInputPolicyDecision.ACCEPT) {
            return ExplicitPackageEvidenceLookupResult(
                status = BankPackageEvidenceLookupStatus.INVALID_PACKAGE_NAME,
                observation = null,
                safeMessage = policy.safeMessage,
                reasonCodes = policy.reasonCodes
            )
        }
        val observation = observations[packageName]
        return if (observation == null) {
            ExplicitPackageEvidenceLookupResult(
                status = BankPackageEvidenceLookupStatus.PACKAGE_NOT_FOUND,
                observation = null,
                safeMessage = "package_not_found; no trust evidence created",
                reasonCodes = listOf("package_not_found")
            )
        } else {
            ExplicitPackageEvidenceLookupResult(
                status = BankPackageEvidenceLookupStatus.FOUND,
                observation = observation,
                safeMessage = "package evidence found; pending operator review; not trusted yet",
                reasonCodes = listOf("explicit_package_lookup", "pending_operator_review")
            )
        }
    }
}
