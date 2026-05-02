package com.swimpay.receiver

data class ReceiverBankProfileSelection(
    val bankProfileId: String,
    val displayName: String,
    val packageName: String,
    val packageCertSha256: String,
    val verificationStatus: BankPackageVerificationStatus,
    val selected: Boolean,
    val reviewOnly: Boolean,
    val syntheticDebugOnly: Boolean
) {
    fun isTrustedForProductionReady(): Boolean {
        return selected &&
            !reviewOnly &&
            !syntheticDebugOnly &&
            verificationStatus == BankPackageVerificationStatus.VERIFIED &&
            packageName != "TO_VERIFY" &&
            packageCertSha256 != "TO_VERIFY" &&
            !packageName.contains("synthetic", ignoreCase = true) &&
            !packageCertSha256.contains("synthetic", ignoreCase = true)
    }

    fun isReviewOnlyDetectionCandidate(): Boolean {
        return selected && (
            reviewOnly ||
                syntheticDebugOnly ||
                verificationStatus == BankPackageVerificationStatus.TO_VERIFY ||
                verificationStatus == BankPackageVerificationStatus.PENDING_VERIFICATION
            )
    }

    fun toOnboardingProfile(): SelectedBankOnboardingProfile {
        return SelectedBankOnboardingProfile(
            bankProfileId = bankProfileId,
            selected = selected,
            verificationStatus = verificationStatus,
            reviewOnly = reviewOnly || !isTrustedForProductionReady(),
            syntheticDebugOnly = syntheticDebugOnly
        )
    }
}

class ReceiverBankProfileSelectionModel(
    private val profiles: List<ReceiverBankProfileSelection>
) {
    fun profiles(): List<ReceiverBankProfileSelection> = profiles

    fun selectedProfiles(): List<ReceiverBankProfileSelection> = profiles.filter { it.selected }

    fun selectedReviewOnlyProfiles(): List<ReceiverBankProfileSelection> {
        return selectedProfiles().filter { it.isReviewOnlyDetectionCandidate() }
    }

    fun hasSelectedBank(): Boolean = selectedProfiles().isNotEmpty()

    fun select(bankProfileId: String): ReceiverBankProfileSelectionModel {
        val known = profiles.any { it.bankProfileId == bankProfileId }
        if (!known) {
            return this
        }
        return ReceiverBankProfileSelectionModel(
            profiles.map {
                if (it.bankProfileId == bankProfileId) it.copy(selected = true) else it
            }
        )
    }

    fun toOnboardingProfiles(): List<SelectedBankOnboardingProfile> {
        return selectedProfiles().map { it.toOnboardingProfile() }
    }
}

object ReceiverBankProfileSelectionDefaults {
    fun v1ReviewOnlyProfiles(): List<ReceiverBankProfileSelection> {
        return listOf(
            reviewOnlyProfile("sber_ru", "Sberbank"),
            reviewOnlyProfile("tbank_ru", "Tinkoff / T-Bank"),
            reviewOnlyProfile("vtb_ru", "VTB"),
            reviewOnlyProfile("alfa_ru", "Alfa-Bank"),
            reviewOnlyProfile("gazprombank_ru", "Gazprombank")
        )
    }

    fun sberToVerify(selected: Boolean): ReceiverBankProfileSelection {
        return reviewOnlyProfile("sber_ru", "Sberbank", selected)
    }

    fun syntheticDebug(selected: Boolean): ReceiverBankProfileSelection {
        return ReceiverBankProfileSelection(
            bankProfileId = "synthetic_debug_only_bank",
            displayName = "Synthetic Debug Bank",
            packageName = "com.swimpay.syntheticbank.debug",
            packageCertSha256 = "synthetic_debug_only_cert",
            verificationStatus = BankPackageVerificationStatus.VERIFIED,
            selected = selected,
            reviewOnly = true,
            syntheticDebugOnly = true
        )
    }

    fun debugSelectedProfiles(debugEnabled: Boolean): List<ReceiverBankProfileSelection> {
        return buildList {
            add(sberToVerify(selected = true))
            if (debugEnabled) {
                add(syntheticDebug(selected = true))
            }
        }
    }

    private fun reviewOnlyProfile(
        bankProfileId: String,
        displayName: String,
        selected: Boolean = false
    ): ReceiverBankProfileSelection {
        return ReceiverBankProfileSelection(
            bankProfileId = bankProfileId,
            displayName = displayName,
            packageName = "TO_VERIFY",
            packageCertSha256 = "TO_VERIFY",
            verificationStatus = BankPackageVerificationStatus.TO_VERIFY,
            selected = selected,
            reviewOnly = true,
            syntheticDebugOnly = false
        )
    }
}

data class BankSelectionUiRow(
    val bankProfileId: String,
    val displayName: String,
    val selected: Boolean,
    val verificationStatus: BankPackageVerificationStatus,
    val reviewOnly: Boolean,
    val syntheticDebugOnly: Boolean,
    val statusLabel: String,
    val warning: String
)

data class BankSelectionUiState(
    val rows: List<BankSelectionUiRow>
)

class BankSelectionOnboardingUiModel {
    fun build(
        selections: List<ReceiverBankProfileSelection>,
        debugEnabled: Boolean
    ): BankSelectionUiState {
        val rows = selections
            .filter { !it.syntheticDebugOnly || debugEnabled }
            .map { selection ->
                BankSelectionUiRow(
                    bankProfileId = selection.bankProfileId,
                    displayName = selection.displayName,
                    selected = selection.selected,
                    verificationStatus = selection.verificationStatus,
                    reviewOnly = selection.reviewOnly || !selection.isTrustedForProductionReady(),
                    syntheticDebugOnly = selection.syntheticDebugOnly,
                    statusLabel = buildStatusLabel(selection),
                    warning = if (selection.reviewOnly || !selection.isTrustedForProductionReady()) {
                        REVIEW_ONLY_WARNING
                    } else {
                        "Profil vérifié pour le mode prêt."
                    }
                )
            }
        return BankSelectionUiState(rows = rows)
    }

    private fun buildStatusLabel(selection: ReceiverBankProfileSelection): String {
        val mode = if (selection.syntheticDebugOnly) "synthetic_debug_only" else "review_only"
        return "${selection.verificationStatus.name}:$mode"
    }

    companion object {
        const val REVIEW_ONLY_WARNING: String =
            "Cette banque peut être utilisée pour détecter des signaux et les envoyer en review. Elle n’est pas encore vérifiée pour l’auto-confirmation."
    }
}
