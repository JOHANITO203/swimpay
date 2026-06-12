package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumOnboardingSessionState
import com.swimpay.receiver.ui.premium.PremiumOnboardingStep
import com.swimpay.receiver.ui.premium.PremiumReceivingMethodDraft
import com.swimpay.receiver.ui.premium.ReceivingCatalog
import com.swimpay.receiver.MerchantReceivingMethodDraft as MerchantReceivingRouteDraft
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumOnboardingFullFlowTest {
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

    @Test
    fun approvedOnboardingStepsAreReceivingFirstAndDropManualBankAllowlistStep() {
        assertEquals(
            listOf(
                PremiumOnboardingStep.WELCOME,
                PremiumOnboardingStep.NOTIFICATION_ACCESS,
                PremiumOnboardingStep.RECEIVING_METHOD,
                PremiumOnboardingStep.CONNECTED_SITE,
                PremiumOnboardingStep.CONFIGURATION_TEST
            ),
            PremiumOnboardingStep.requiredSequence
        )
        assertFalse(
            "manual bank-allowlist step must be gone",
            PremiumOnboardingStep.entries.any { it.name == "COMPATIBLE_BANK_SELECTION" }
        )
    }

    @Test
    fun notificationAccessBlocksContinuationUntilEnabled() {
        val disabled = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.NOTIFICATION_ACCESS,
            notificationAccessEnabled = false
        )

        assertFalse(disabled.canContinueFrom())
        assertTrue(disabled.withNotificationAccess(true).canContinueFrom())
    }

    @Test
    fun connectedSiteSkipCompletesOnboardingWithoutRunningWebhookTest() {
        val skipped = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONNECTED_SITE,
            notificationAccessEnabled = true,
            receivingMethodConfigured = true,
            receivingMethodSubmission = cardSubmission("sber_ru")
        ).skipConnectedSite()

        assertTrue(skipped.canContinueFrom())
        val completed = skipped.completeAndMoveNext()

        assertTrue(completed.skippedConnectedSite)
        assertTrue(completed.onboardingCompleted)
        assertFalse(completed.connectedSiteConfigured)
        assertFalse(completed.configurationTestRan)
        assertEquals(PremiumOnboardingStep.CONNECTED_SITE, completed.currentStep)
        assertTrue(completed.completedSteps.contains(PremiumOnboardingStep.CONNECTED_SITE))
    }

    @Test
    fun connectedSiteAddNowContinuesToBackendOwnedWebhookTestOnly() {
        val readyForSite = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONNECTED_SITE,
            notificationAccessEnabled = true,
            receivingMethodConfigured = true,
            receivingMethodSubmission = cardSubmission("sber_ru")
        )
        val next = readyForSite.connectSite().completeAndMoveNext()

        assertTrue(next.connectedSiteConfigured)
        assertFalse(next.skippedConnectedSite)
        assertFalse(next.onboardingCompleted)
        assertFalse(next.configurationTestRan)
        assertEquals(PremiumOnboardingStep.CONFIGURATION_TEST, next.currentStep)
        assertTrue(next.canContinueFrom())
        assertEquals(
            listOf(
                "Accès notifications activé",
                "Moyen de réception ajouté",
                "Webhook configuré"
            ),
            next.configurationChecklistLabels()
        )
    }

    @Test
    fun webhookTestRequiresConnectedSiteConfiguration() {
        val missingWebhook = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONFIGURATION_TEST,
            notificationAccessEnabled = true,
            receivingMethodConfigured = true,
            receivingMethodSubmission = cardSubmission("sber_ru"),
            connectedSiteConfigured = false
        )

        assertFalse(missingWebhook.configurationTestReady)
        assertFalse(missingWebhook.canContinueFrom())
        assertTrue(missingWebhook.configurationResultLabels().contains("Webhook à configurer"))
    }

    @Test
    fun receivingMethodWithNotificationPackageDerivesAllowlistFromTheChosenMethod() {
        // One choice, double consequence: the route bank AND the derived notification
        // allowlist follow the chosen receiving method (no separate manual screen).
        val configured = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true
        ).withReceivingMethod(cardSubmission("sber_ru"))

        assertEquals(setOf("sber_ru"), configured.derivedEnabledBankProfileIds)
        assertEquals(
            ReceivingCatalog.packagesFor(setOf("sber_ru")),
            configured.derivedNotificationPackages
        )
        assertTrue(configured.derivedNotificationPackages.contains("ru.sberbankmobile"))
    }

    @Test
    fun westAfricaPackagelessWalletConfiguresRouteWithoutFakingAnAllowlist() {
        // Wave CI has no receiver notification package (manual model): choosing it must
        // still configure the receiving method but contribute nothing to the allowlist
        // — the UI must not imply Wave is monitored.
        val wave = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true
        ).withReceivingMethod(mobileMoneySubmission("wave_ci"))

        assertTrue(wave.receivingMethodConfigured)
        assertTrue(wave.canContinueFrom())
        assertTrue(wave.derivedEnabledBankProfileIds.isEmpty())
        assertTrue(wave.derivedNotificationPackages.isEmpty())

        // MTN MoMo CI, by contrast, does carry a real package and is derivable.
        val mtn = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true
        ).withReceivingMethod(mobileMoneySubmission("mtn_momo_ci"))
        assertEquals(setOf("mtn_momo_ci"), mtn.derivedEnabledBankProfileIds)
        assertTrue(mtn.derivedNotificationPackages.isNotEmpty())
    }

    @Test
    fun configurationReadinessFollowsTheDerivedReceivingMethodNotAManualBankList() {
        val ready = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONFIGURATION_TEST,
            notificationAccessEnabled = true,
            connectedSiteConfigured = true
        ).withReceivingMethod(cardSubmission("sber_ru"))

        assertTrue(ready.configurationTestReady)
        assertTrue(ready.canContinueFrom())
        assertFalse(ready.withConfigurationTestRan().onboardingCompleted)
        assertTrue(ready.completeAndMoveNext().onboardingCompleted)
    }

    @Test
    fun receivingMethodStepRequiresPersistentSubmissionNotJustChoice() {
        val choiceOnly = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true
        ).withReceivingMethod(PremiumReceivingMethodDraft.CARD_TRANSFER)

        assertFalse(choiceOnly.receivingMethodConfigured)
        assertFalse(choiceOnly.canContinueFrom())
        assertTrue(choiceOnly.derivedEnabledBankProfileIds.isEmpty())

        val submission = MerchantReceivingRouteDraft(
            bankProfileId = "sber_ru",
            type = ReceivingMethodType.PHONE_TRANSFER,
            rawIdentifierInput = "+79991234567"
        ).toSubmission()
        val configured = choiceOnly.withReceivingMethod(submission)

        assertTrue(configured.receivingMethodConfigured)
        assertTrue(configured.canContinueFrom())
        assertEquals(submission, configured.receivingMethodSubmission)
        assertEquals(PremiumReceivingMethodDraft.PHONE_TRANSFER, configured.receivingMethodDraft)
        assertEquals(setOf("sber_ru"), configured.derivedEnabledBankProfileIds)
    }

    @Test
    fun activeOnboardingSourceContainsApprovedReceivingFirstScreenCopy() {
        val source = onboardingSource()
        val approvedCopy = listOf(
            "Recevez vos paiements plus facilement",
            "SwimPay détecte les paiements reçus, vous aide à les confirmer et prévient votre site ou votre application.",
            "Connectez votre téléphone",
            "Accès nécessaire",
            "Activer l'accès",
            "Ajoutez votre moyen de réception",
            "Connectez votre site ou application",
            "Configurer plus tard",
            "Test webhook",
            "Lancer le test webhook",
            "déclenché par le backend",
            "Pratique pour les virements via SBP."
        )

        approvedCopy.forEach { copy ->
            assertTrue("missing approved onboarding copy: $copy", source.contains(copy))
        }
        // The manual bank-allowlist step is removed in the receiving-first flow.
        assertFalse(source.contains("CompatibleBankSelectionStep"))
        assertFalse(source.contains("CompatibleBankDetectionStep"))
        assertFalse(source.contains("private fun BankSelectionStep("))
        assertFalse(source.contains("Choisissez vos banques"))
        assertFalse(source.contains("Activer ces banques"))
        assertFalse(source.contains("Tester sans site connecté"))
        assertFalse(source.contains("Lancer un test complet"))
        assertFalse(source.contains("paiement est confirmé", ignoreCase = true))
        // The receiving-method step consumes the unified catalog (all regions incl. WA).
        assertTrue(source.contains("ReceivingCatalog.allMethods"))
    }

    @Test
    fun onboardingDoesNotClaimToMonitorOrRecognizeInstalledApps() {
        // Honesty guard (T3): the app never enumerates installed apps and has no
        // source-app host-identity module. No onboarding copy or widget may imply it
        // surveils apps, scans the device, or "recognizes" the source app/channel.
        val source = onboardingSource()
        val dishonestPhrases = listOf(
            "Apps surveillées",
            "Monitored apps",
            "MonitoredAppsRow",
            "canal reconnu",
            "channel recognized",
            "surveille les apps",
            "détecte les apps"
        )
        dishonestPhrases.forEach { phrase ->
            assertFalse("dishonest detection/monitoring copy still present: $phrase", source.contains(phrase, ignoreCase = true))
        }
        // The honest permission framing must be present instead.
        assertTrue(
            source.contains("SwimPay lit uniquement la notification de paiement de ces apps. Jamais vos SMS ni vos autres apps. Le texte brut n'est jamais conservé.")
        )
    }

    @Test
    fun activeOnboardingSourceRemovesLegacyBusinessAndPolicySteps() {
        val source = onboardingSource()
        val forbiddenLegacyCopy = listOf(
            "Profil Marchand",
            "Policy Engine",
            "Terminal synchronisé",
            "CONFIRMATION MANUELLE",
            "IA PLUS TARD",
            "FINALISER LA CONFIGURATION",
            "webhook Instant",
            "paiements automatiques"
        )

        forbiddenLegacyCopy.forEach { copy ->
            assertFalse("legacy onboarding copy still active: $copy", source.contains(copy, ignoreCase = true))
        }
    }

    @Test
    fun onboardingSafetyGuardrailsRemainStatic() {
        val manifest = File("src/main/AndroidManifest.xml").readText() +
            "\n" +
            File("src/debug/AndroidManifest.xml").readText()
        val source = onboardingSource() +
            "\n" +
            File("src/main/java/com/swimpay/receiver/BankTargetLock.kt").readText()

        listOf(
            "QUERY_ALL_PACKAGES",
            "android.permission.READ_SMS",
            "android.permission.RECEIVE_SMS",
            "AccessibilityService",
            "getInstalledPackages",
            "getInstalledApplications",
            "payment.confirmed",
            "official_bank_confirmation = true",
            "confirmation bancaire officielle"
        ).forEach { forbidden ->
            assertFalse("forbidden onboarding behavior exposed: $forbidden", "$manifest\n$source".contains(forbidden, ignoreCase = true))
        }
    }

    private fun onboardingSource(): String {
        return File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
    }
}
