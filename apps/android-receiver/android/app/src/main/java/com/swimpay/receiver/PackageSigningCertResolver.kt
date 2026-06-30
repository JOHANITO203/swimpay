package com.swimpay.receiver

import android.content.Context
import java.util.concurrent.ConcurrentHashMap

/**
 * Resolves the REAL signing-cert SHA-256 of an installed bank app for the live notification
 * signal, so the uploaded signal carries the on-device cert instead of the "TO_VERIFY"
 * placeholder. The backend JOINs this against the operator-vetted expected cert
 * (bank_app_signatures, migration 034): a match yields bankAppVerificationStatus='verified'
 * → 'trusted_cert' → the auto-confirm floor. A mismatch yields no trust — the model fails
 * closed, so a wrong/stale anchor never produces FALSE trust, only the absence of auto-confirm.
 *
 * Reuses the existing PackageManager evidence path (no second cert reader). Only probes
 * packages declared in [BankTargetLock] (the same set already in the manifest <queries>),
 * and caches per package so the cert is read once, not on every notification.
 */
class PackageSigningCertResolver(
    private val lookup: ExplicitPackageEvidenceLookup
) {
    private val cache = ConcurrentHashMap<String, String>()

    fun resolve(packageName: String): String {
        val bankProfileId = BankTargetLock.bankProfileIdForPackage(packageName) ?: return TO_VERIFY
        return cache.computeIfAbsent(packageName) {
            val observed = lookup
                .lookupExplicitPackageEvidence(bankProfileId, packageName, capturedAt = "")
                .observation
                ?.packageCertSha256
            if (observed != null && observed != TO_VERIFY) observed else TO_VERIFY
        }
    }

    companion object {
        private const val TO_VERIFY = "TO_VERIFY"

        fun forContext(context: Context): PackageSigningCertResolver {
            return PackageSigningCertResolver(PackageManagerBankPackageEvidenceCollector(context))
        }
    }
}
