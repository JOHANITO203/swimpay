package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Proves the live signal now carries the REAL on-device signing cert instead of the
 * "TO_VERIFY" placeholder — the maillon that lets the backend reach 'trusted_cert' and
 * fire auto-confirm. The resolver only probes packages known to BankTargetLock, caches per
 * package, and fails closed to "TO_VERIFY" when the cert cannot be read.
 */
class PackageSigningCertResolverTest {

    private class FakeEvidenceLookup(
        private val cert: String?
    ) : ExplicitPackageEvidenceLookup {
        var calls = 0
            private set

        override fun lookupExplicitPackageEvidence(
            bankProfileId: String,
            packageName: String,
            capturedAt: String
        ): ExplicitPackageEvidenceLookupResult {
            calls += 1
            val observation = cert?.let {
                BankPackageEvidenceObservation(
                    bankProfileId = bankProfileId,
                    packageName = packageName,
                    packageCertSha256 = it,
                    source = BankPackageEvidenceSource.PACKAGE_MANAGER_DRY_RUN,
                    capturedAt = capturedAt,
                    displayLabel = "Test"
                )
            }
            return ExplicitPackageEvidenceLookupResult(
                status = if (observation != null) {
                    BankPackageEvidenceLookupStatus.FOUND
                } else {
                    BankPackageEvidenceLookupStatus.PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED
                },
                observation = observation,
                safeMessage = "test",
                reasonCodes = emptyList()
            )
        }
    }

    @Test
    fun resolvesRealCertForSupportedPackage() {
        val cert = "149c4ea5825a81065589d27a60ea7e554df4b49e3c660cb65ba730025080dbd0"
        val resolver = PackageSigningCertResolver(FakeEvidenceLookup(cert))

        assertEquals(cert, resolver.resolve("com.transferwise.android"))
    }

    @Test
    fun unsupportedPackageNeverProbesAndReturnsToVerify() {
        val lookup = FakeEvidenceLookup("ignored")
        val resolver = PackageSigningCertResolver(lookup)

        assertEquals("TO_VERIFY", resolver.resolve("com.example.unrelated"))
        // An unknown package is never even looked up — no arbitrary cert reads.
        assertEquals(0, lookup.calls)
    }

    @Test
    fun unreadableCertFailsClosedToToVerify() {
        val resolver = PackageSigningCertResolver(FakeEvidenceLookup(cert = null))

        assertEquals("TO_VERIFY", resolver.resolve("ru.sberbankmobile"))
    }

    @Test
    fun cachesPerPackageSoCertIsReadOnce() {
        val lookup = FakeEvidenceLookup("9c9be07135e972780282c2e5d27da06ecb8ee3adfc75303917ddf66d6faaefa4")
        val resolver = PackageSigningCertResolver(lookup)

        resolver.resolve("com.revolut.revolut")
        resolver.resolve("com.revolut.revolut")
        resolver.resolve("com.revolut.revolut")

        assertEquals(1, lookup.calls)
    }
}
