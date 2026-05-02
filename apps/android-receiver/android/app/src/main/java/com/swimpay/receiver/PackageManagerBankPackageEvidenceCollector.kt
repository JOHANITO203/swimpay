package com.swimpay.receiver

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import java.security.MessageDigest

interface BankPackageEvidenceCollector {
    fun collectExplicitPackageEvidence(
        bankProfileId: String,
        packageName: String,
        capturedAt: String
    ): BankPackageEvidenceObservation
}

class PackageManagerBankPackageEvidenceCollector(
    private val context: Context
) : BankPackageEvidenceCollector {
    override fun collectExplicitPackageEvidence(
        bankProfileId: String,
        packageName: String,
        capturedAt: String
    ): BankPackageEvidenceObservation {
        require(packageName.isNotBlank()) { "package name is required for explicit evidence collection" }
        val info = packageInfo(packageName)
        val cert = signingCertificateSha256(info) ?: "TO_VERIFY"
        val label = info.applicationInfo?.loadLabel(context.packageManager)?.toString()
            ?: "PackageManager evidence"

        return BankPackageEvidenceObservation(
            bankProfileId = bankProfileId,
            packageName = packageName,
            packageCertSha256 = cert,
            source = BankPackageEvidenceSource.PACKAGE_MANAGER_DRY_RUN,
            capturedAt = capturedAt,
            displayLabel = label
        )
    }

    private fun packageInfo(packageName: String): PackageInfo {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            context.packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
        }
    }

    private fun signingCertificateSha256(info: PackageInfo): String? {
        val certBytes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.signingInfo?.apkContentsSigners?.firstOrNull()?.toByteArray()
        } else {
            @Suppress("DEPRECATION")
            info.signatures?.firstOrNull()?.toByteArray()
        } ?: return null

        return MessageDigest.getInstance("SHA-256")
            .digest(certBytes)
            .joinToString("") { "%02x".format(it) }
    }
}
