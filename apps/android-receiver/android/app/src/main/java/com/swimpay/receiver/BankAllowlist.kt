package com.swimpay.receiver

enum class BankPackageVerificationStatus {
    TO_VERIFY,
    PENDING_VERIFICATION,
    VERIFIED,
    REJECTED,
    REVOKED
}

data class AllowedBankProfile(
    val bankProfileId: String,
    val packageName: String,
    val certSha256: String,
    val verificationStatus: BankPackageVerificationStatus
) {
    fun isTrustedForUpload(): Boolean {
        return verificationStatus == BankPackageVerificationStatus.VERIFIED &&
            packageName != "TO_VERIFY" &&
            certSha256 != "TO_VERIFY" &&
            certSha256 != "documented_unknown"
    }
}
