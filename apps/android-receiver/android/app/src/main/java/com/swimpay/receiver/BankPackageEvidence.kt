package com.swimpay.receiver

enum class BankPackageEvidenceSource {
    PACKAGE_MANAGER_DRY_RUN,
    SYNTHETIC_DEBUG_ONLY,
    OPERATOR_SUPPLIED
}

enum class BankPackageEvidenceDecision {
    REVIEW_ONLY,
    OPERATOR_REVIEW_REQUIRED,
    REJECTED
}

data class BankPackageEvidenceObservation(
    val bankProfileId: String,
    val packageName: String,
    val packageCertSha256: String,
    val source: BankPackageEvidenceSource,
    val capturedAt: String,
    val displayLabel: String
) {
    fun hasConcretePackageAndCert(): Boolean {
        return packageName.isNotBlank() &&
            packageCertSha256.isNotBlank() &&
            packageName != "TO_VERIFY" &&
            packageCertSha256 != "TO_VERIFY" &&
            !packageName.contains("synthetic_debug_only", ignoreCase = true) &&
            !packageCertSha256.contains("synthetic_debug_only", ignoreCase = true)
    }
}

data class BankPackageEvidenceAssessment(
    val observation: BankPackageEvidenceObservation,
    val decision: BankPackageEvidenceDecision,
    val selection: ReceiverBankProfileSelection,
    val reasonCodes: List<String>
)

class BankPackageEvidencePolicy {
    fun assess(observation: BankPackageEvidenceObservation): BankPackageEvidenceAssessment {
        val synthetic = observation.source == BankPackageEvidenceSource.SYNTHETIC_DEBUG_ONLY ||
            observation.packageName.contains("synthetic_debug_only", ignoreCase = true) ||
            observation.packageCertSha256.contains("synthetic_debug_only", ignoreCase = true)

        val decision = when {
            synthetic -> BankPackageEvidenceDecision.REVIEW_ONLY
            observation.hasConcretePackageAndCert() -> BankPackageEvidenceDecision.OPERATOR_REVIEW_REQUIRED
            else -> BankPackageEvidenceDecision.REVIEW_ONLY
        }

        val verificationStatus = when {
            synthetic -> BankPackageVerificationStatus.VERIFIED
            observation.hasConcretePackageAndCert() -> BankPackageVerificationStatus.PENDING_VERIFICATION
            else -> BankPackageVerificationStatus.TO_VERIFY
        }

        val reasonCodes = buildList {
            if (synthetic) add("synthetic_debug_only")
            if (!observation.hasConcretePackageAndCert() && !synthetic) add("package_cert_to_verify")
            if (observation.hasConcretePackageAndCert() && !synthetic) add("operator_review_required")
            add("review_only_until_verified")
        }

        val selection = ReceiverBankProfileSelection(
            bankProfileId = observation.bankProfileId,
            displayName = redactDebugMessage(observation.displayLabel),
            packageName = observation.packageName,
            packageCertSha256 = observation.packageCertSha256,
            verificationStatus = verificationStatus,
            selected = true,
            reviewOnly = true,
            syntheticDebugOnly = synthetic
        )
        require(!selection.isTrustedForProductionReady()) {
            "package evidence dry run must not create production trust"
        }

        return BankPackageEvidenceAssessment(
            observation = observation.copy(displayLabel = redactDebugMessage(observation.displayLabel)),
            decision = decision,
            selection = selection,
            reasonCodes = reasonCodes
        )
    }
}

data class BankPackageEvidenceDiagnostics(
    val bankProfileId: String,
    val packageName: String,
    val certSha256Masked: String,
    val source: BankPackageEvidenceSource,
    val decision: BankPackageEvidenceDecision,
    val verificationStatus: BankPackageVerificationStatus,
    val reviewOnly: Boolean,
    val syntheticDebugOnly: Boolean,
    val reasonCodes: List<String>,
    val capturedAt: String,
    val safeLabel: String
)

class BankPackageEvidenceDiagnosticsExporter {
    fun export(assessment: BankPackageEvidenceAssessment): BankPackageEvidenceDiagnostics {
        return BankPackageEvidenceDiagnostics(
            bankProfileId = redactDebugMessage(assessment.observation.bankProfileId),
            packageName = redactDebugMessage(assessment.observation.packageName),
            certSha256Masked = maskCertSha256(assessment.observation.packageCertSha256),
            source = assessment.observation.source,
            decision = assessment.decision,
            verificationStatus = assessment.selection.verificationStatus,
            reviewOnly = assessment.selection.reviewOnly,
            syntheticDebugOnly = assessment.selection.syntheticDebugOnly,
            reasonCodes = assessment.reasonCodes.map { redactDebugMessage(it) },
            capturedAt = redactDebugMessage(assessment.observation.capturedAt),
            safeLabel = redactDebugMessage(assessment.observation.displayLabel)
        )
    }
}

fun maskCertSha256(value: String): String {
    if (value == "TO_VERIFY") {
        return "TO_VERIFY"
    }
    if (value.contains("synthetic_debug_only", ignoreCase = true)) {
        return "synthetic_debug_only"
    }
    if (value.length <= 12) {
        return "<REDACTED>"
    }
    return "${value.take(6)}...${value.takeLast(6)}"
}
