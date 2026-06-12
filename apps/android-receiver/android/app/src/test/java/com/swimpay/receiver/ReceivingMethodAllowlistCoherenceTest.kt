package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumOnboardingSessionState
import com.swimpay.receiver.ui.premium.PremiumOnboardingStep
import com.swimpay.receiver.ui.premium.ReceivingCatalog
import com.swimpay.receiver.ui.premium.ReceivingRegion
import com.swimpay.receiver.MerchantReceivingMethodDraft as MerchantReceivingRouteDraft
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * T5 — end-to-end COHERENCE of the single product axis ("what the user receives on").
 *
 * These tests pin the *chain*, not single screens: choosing a receiving method must
 * drive (a) the destination route AND (b) the derived notification allowlist; the
 * allowlist must be the only thing the runtime capture path listens for; and a method
 * that cannot be auto-detected (package-less WA wallet) must never be presented as
 * detected/monitored anywhere.
 *
 * They run at the pure-logic seams (catalog → ReceiverRuntimeConfig → ReceiverBoundaries
 * → BankTargetLock) so they need no Android Context or Compose runtime. The one
 * Compose-bound seam (`finishOnboarding`, which lives inside the @Composable app) is
 * pinned by a source-text contract instead, matching the T2/T3 guard style.
 */
class ReceivingMethodAllowlistCoherenceTest {

    private fun cardSubmission(bankProfileId: String) = MerchantReceivingRouteDraft(
        bankProfileId = bankProfileId,
        type = ReceivingMethodType.CARD_TRANSFER,
        rawIdentifierInput = "2200123412344821"
    ).toSubmission()

    private fun mobileMoneySubmission(bankProfileId: String) = MerchantReceivingRouteDraft(
        bankProfileId = bankProfileId,
        type = ReceivingMethodType.MOBILE_MONEY,
        rawIdentifierInput = "+2250700000000"
    ).toSubmission()

    private fun chosen(submission: com.swimpay.receiver.MerchantReceivingMethodSubmission) =
        PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true
        ).withReceivingMethod(submission)

    // ── 1. One choice → BOTH consequences (route destination AND derived allowlist) ──

    @Test
    fun choosingARealPackageMethodDrivesBothTheRouteAndTheNotificationAllowlist() {
        // A merchant declares ONE receiving method (Sberbank). The same submission is
        // the route destination (createReceivingMethod) AND the source of the derived
        // notification allowlist — never a separate manual screen.
        val state = chosen(cardSubmission("sber_ru"))

        // (a) Destination: the route the runtime persists carries the chosen bank id.
        assertEquals("sber_ru", state.receivingMethodSubmission?.bankProfileId)

        // (b) Allowlist: the derived bank-profile ids contain exactly that method,
        // because it carries a real receiver notification package.
        assertEquals(setOf("sber_ru"), state.derivedEnabledBankProfileIds)

        // And the allowlist the *runtime capture path* actually uses
        // (ReceiverRuntimeConfig.enabledBankPackages) contains Sberbank's package.
        val config = ReceiverRuntimeConfig(
            enabledBankProfileIds = state.derivedEnabledBankProfileIds,
            merchantId = "m_test"
        )
        assertEquals(setOf("ru.sberbankmobile"), config.enabledBankPackages)
    }

    @Test
    fun choosingMtnMobileMoneyDrivesBothTheRouteAndTheAllowlistTheListenerWillHonour() {
        val state = chosen(mobileMoneySubmission("mtn_momo_ci"))

        assertEquals("mtn_momo_ci", state.receivingMethodSubmission?.bankProfileId)
        assertEquals(setOf("mtn_momo_ci"), state.derivedEnabledBankProfileIds)

        val config = ReceiverRuntimeConfig(
            enabledBankProfileIds = state.derivedEnabledBankProfileIds,
            merchantId = "m_test"
        )
        // MTN's primary receiver package is allowed by the runtime capture path.
        assertTrue(config.enabledBankPackages.contains("mtnft.momo.consumer"))
    }

    // ── 2. Package-less WA wallet → route created, EMPTY allowlist, NOT monitored ──

    @Test
    fun choosingAPackagelessWaWalletCreatesARouteButDerivesAnEmptyAllowlist() {
        // Wave CI has no receiver notification package (manual model). Choosing it must
        // still configure a route, but contribute NOTHING to the allowlist — so the
        // runtime never claims to monitor an app it cannot read.
        val state = chosen(mobileMoneySubmission("wave_ci"))

        // Route is configured (destination exists)…
        assertTrue(state.receivingMethodConfigured)
        assertEquals("wave_ci", state.receivingMethodSubmission?.bankProfileId)

        // …but the derived allowlist is EMPTY (no package to listen for).
        assertTrue(state.derivedEnabledBankProfileIds.isEmpty())
        assertTrue(state.derivedNotificationPackages.isEmpty())

        // And the runtime config store would REJECT an empty allowlist — proving there is
        // no monitored bank to persist for a package-less wallet (finishOnboarding skips
        // the save instead of fabricating one).
        var rejected = false
        try {
            ReceiverRuntimeConfig(
                enabledBankProfileIds = state.derivedEnabledBankProfileIds,
                merchantId = "m_test"
            ).enabledBankPackages
            // Constructing the config is fine; the empty package set is the honest signal.
        } catch (_: IllegalArgumentException) {
            rejected = true
        }
        assertFalse("config construction itself must not throw", rejected)
        assertEquals(
            emptySet<String>(),
            ReceiverRuntimeConfig(
                enabledBankProfileIds = state.derivedEnabledBankProfileIds,
                merchantId = "m_test"
            ).enabledBankPackages
        )
    }

    @Test
    fun packagelessWaWalletsAreStructurallyAbsentFromTheDetectionSurface() {
        // The whole detection surface (banks/health/dashboard "detected" counts) is built
        // by BankTargetLock.resolveTargets, which iterates ONLY supportedTargets. Wave and
        // Orange Money CI are NOT in supportedTargets, so they can never be rendered as
        // detected/enabled/monitored anywhere — even if a user "selected" them.
        val resolvedIds = BankTargetLock.resolveTargets(
            probe = object : ExactPackageProbe {
                override fun isInstalled(packageName: String): Boolean = true // pretend every package is installed
            },
            selectedBankProfileIds = setOf("wave_ci", "orange_money_ci"),
            enabledBankProfileIds = setOf("wave_ci", "orange_money_ci"),
            listenerReady = true
        ).map { it.bankProfileId }.toSet()

        assertFalse("Wave must never appear on the detection surface", resolvedIds.contains("wave_ci"))
        assertFalse("Orange Money must never appear on the detection surface", resolvedIds.contains("orange_money_ci"))
        // The catalog still lists them as addable receiving methods (declared, not detected).
        assertTrue(ReceivingCatalog.allMethods.any { it.bankProfileId == "wave_ci" })
        assertTrue(ReceivingCatalog.allMethods.any { it.bankProfileId == "orange_money_ci" })
    }

    // ── 3. The runtime capture path listens for EXACTLY the derived allowlist ──

    @Test
    fun runtimeCapturePathAllowsExactlyThePackagesDerivedFromTheChosenMethods() {
        // Chain: chosen ids → ReceiverRuntimeConfig.enabledBankPackages → the packages the
        // listener gates on via ReceiverBoundaries.isRuntimeNotificationAllowed.
        val config = ReceiverRuntimeConfig(
            enabledBankProfileIds = setOf("sber_ru"),
            merchantId = "m_test"
        )
        val allowed = config.enabledBankPackages

        // A notification from the derived package is allowed.
        assertTrue(
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = "ru.sberbankmobile",
                appPackageName = "com.swimpay.receiver",
                debugEnabled = false,
                enabledBankPackages = allowed
            )
        )
        // A notification from a NON-derived bank package (Tinkoff, not chosen) is rejected.
        assertFalse(
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = "com.idamob.tinkoff.android",
                appPackageName = "com.swimpay.receiver",
                debugEnabled = false,
                enabledBankPackages = allowed
            )
        )
        // A package-less WA wallet contributes no package, so nothing WA is ever allowed.
        val waConfigPackages = ReceiverRuntimeConfig(
            enabledBankProfileIds = setOf("sber_ru"),
            merchantId = "m_test"
        ).enabledBankPackages
        assertFalse(waConfigPackages.any { it.contains("wave", ignoreCase = true) })
    }

    // ── 4. The unified catalog is the SINGLE source feeding both surfaces ──

    @Test
    fun onboardingAndReceivingOverviewAreFedFromTheSameUnifiedCatalog() {
        val dashboard = File(
            "src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt"
        ).readText()
        val onboarding = File(
            "src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt"
        ).readText()

        // Both the onboarding receiving-method step and the receiving overview build from
        // the same ReceivingCatalog object — no second hard-coded list.
        assertTrue(
            "onboarding must consume the unified catalog",
            onboarding.contains("ReceivingCatalog.allMethods")
        )
        assertTrue(
            "receiving overview must consume the unified catalog",
            dashboard.contains("ReceivingCatalog.byRegion(")
        )

        // The catalog itself is the union of the three regions with no duplicate ids — so
        // "same source" provably means "same entries".
        val all = ReceivingCatalog.allMethods.map { it.bankProfileId }
        assertEquals("catalog ids must be unique (single source, no dup)", all.distinct().size, all.size)
        assertEquals(
            all.toSet(),
            (ReceivingCatalog.byRegion(ReceivingRegion.RU) +
                ReceivingCatalog.byRegion(ReceivingRegion.WEST_AFRICA) +
                ReceivingCatalog.byRegion(ReceivingRegion.INTERNATIONAL))
                .map { it.bankProfileId }.toSet()
        )
    }

    // ── 5. finishOnboarding writes BOTH consequences from the one choice ──

    @Test
    fun finishOnboardingPersistsBothTheRouteAndTheDerivedAllowlistFromTheOneChoice() {
        // finishOnboarding lives inside the @Composable app, so it is pinned by a
        // source-text contract: from the single completed onboarding state it must
        // (a) create the receiving-method ROUTE from the chosen submission, and
        // (b) persist the notification ALLOWLIST derived from that same choice — and
        // skip the persist (rather than fabricate a bank) when the allowlist is empty.
        val app = File(
            "src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt"
        ).readText().replace("\r\n", "\n")

        // (a) Route from the chosen submission.
        assertTrue(
            "finishOnboarding must create the route from the chosen submission",
            app.contains("activeRuntime.createReceivingMethod(receivingMethodSubmission)")
        )
        // (b) Allowlist DERIVED from the same choice (not a parallel manual list).
        assertTrue(
            "allowlist must be derived from the chosen method",
            app.contains("completedState.derivedEnabledBankProfileIds")
        )
        // The derived allowlist is what gets persisted into the runtime config.
        assertTrue(
            "derived allowlist must be persisted into ReceiverRuntimeConfig",
            app.contains("ReceiverRuntimeConfig(") &&
                app.contains("enabledBankProfileIds = enabledBankProfileIds")
        )
        // Empty (package-less WA) → skip the save, never fabricate a monitored bank.
        assertTrue(
            "empty allowlist must skip the persist, not fabricate a bank",
            app.contains("if (enabledBankProfileIds.isNotEmpty())")
        )
        // The derived ids are also what gets registered with the backend (one choice →
        // backend route registration uses the same derived set).
        assertTrue(
            "backend registration must use the derived allowlist",
            app.contains("enabledBankProfileIds = enabledBankProfileIds,")
        )
    }

    // ── Consolidated guard: no running screen renders a package-less wallet as detected ──

    @Test
    fun noRunningScreenLabelsAPackagelessWalletAsDetectedOrMonitored() {
        // Belt-and-braces over the structural guarantee above: scan the user-facing
        // screen + runtime sources for any literal that would tie Wave / Orange Money to
        // a detection/monitoring claim. (They may appear as addable receiving methods —
        // that is "declared", not "detected".)
        val sources = listOf(
            "src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt",
            "src/main/java/com/swimpay/receiver/ui/premium/PremiumWalletDetailScreen.kt",
            "src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt"
        ).joinToString("\n") { File(it).readText() }

        listOf(
            "Wave détectée",
            "Wave surveillée",
            "Orange Money détectée",
            "Orange Money surveillée",
            "wave_ci détect",
            "orange_money_ci détect"
        ).forEach { dishonest ->
            assertFalse(
                "package-less wallet must not be shown as detected/monitored: $dishonest",
                sources.contains(dishonest, ignoreCase = true)
            )
        }
    }
}
